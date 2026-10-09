import { PaymentMethod, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma";
import { badRequest, conflict, HttpError, notFound } from "../utils/http";
import { Decimal, money } from "../utils/money";
import { billContext, serializeSession, serializeTable, sessionTotal } from "./serializers";

const sessionInclude = {
  orders: {
    orderBy: { createdAt: "asc" },
    include: { items: { orderBy: { id: "asc" } }, statusHistory: { orderBy: { createdAt: "asc" } } },
  },
} satisfies Prisma.TableSessionInclude;

export async function getSession(restaurantId: number, id: number) {
  const session = await prisma.tableSession.findFirst({ where: { id, restaurantId }, include: sessionInclude });
  if (!session) throw notFound("session.notFound");
  return serializeSession(session);
}

/** A table plus its current open bill (null when the table is free). */
export async function getTableWithBill(restaurantId: number, tableId: number) {
  const table = await prisma.table.findFirst({ where: { id: tableId, restaurantId } });
  if (!table) throw notFound("table.notFound");
  const session = await prisma.tableSession.findFirst({
    where: { tableId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
    include: sessionInclude,
  });
  return { table: serializeTable(table), session: session ? serializeSession(session) : null };
}

/**
 * Checkout: freezes the total, records the payment method and completes every order on the bill.
 * Refuses while new (un-accepted) orders are waiting, so nothing is billed by accident.
 */
export async function closeSession(restaurantId: number, userId: number, id: number, paymentMethod: PaymentMethod) {
  await prisma.$transaction(async (tx) => {
    const session = await tx.tableSession.findFirst({ where: { id, restaurantId }, include: sessionInclude });
    if (!session) throw notFound("session.notFound");
    if (session.status === "CLOSED") throw conflict("session.closed");
    const pending = session.orders.filter((o) => o.status === "PENDING").length;
    if (pending) throw conflict("session.hasPending", { count: pending });

    const { count } = await tx.tableSession.updateMany({
      where: { id, status: "OPEN" },
      data: {
        status: "CLOSED",
        closeType: "PAID",
        closedAt: new Date(),
        closedByUserId: userId,
        paymentMethod,
        totalAmount: sessionTotal(session),
      },
    });
    if (count === 0) throw conflict("session.closed");

    for (const o of session.orders) {
      if (o.status === "CANCELLED" || o.status === "COMPLETED") continue;
      await tx.order.update({ where: { id: o.id }, data: { status: "COMPLETED" } });
      await tx.orderItem.updateMany({ where: { orderId: o.id, servedAt: null }, data: { servedAt: new Date() } });
      await tx.orderStatusHistory.create({ data: { orderId: o.id, fromStatus: o.status, toStatus: "COMPLETED", changedByUserId: userId } });
    }
  });
  return getSession(restaurantId, id);
}

/**
 * "New guests sat down before the previous bill was closed": moves the given (latest) orders to a fresh
 * bill for the same table, then checks out the previous guests' bill with what remains.
 */
export async function splitAndClose(restaurantId: number, userId: number, id: number, paymentMethod: PaymentMethod, moveOrderIds: number[]) {
  const newSessionId = await prisma.$transaction(async (tx) => {
    const session = await tx.tableSession.findFirst({ where: { id, restaurantId }, include: sessionInclude });
    if (!session) throw notFound("session.notFound");
    if (session.status === "CLOSED") throw conflict("session.closed");

    const moving = new Set(moveOrderIds);
    if (moveOrderIds.some((o) => !session.orders.some((x) => x.id === o))) throw badRequest("order.notFound");
    const remaining = session.orders.filter((o) => !moving.has(o.id));
    if (!remaining.length) throw badRequest("session.splitEmpty");
    const pending = remaining.filter((o) => o.status === "PENDING").length;
    if (pending) throw conflict("session.hasPending", { count: pending });

    // Close the previous guests' bill first (the table may only have one open bill).
    const total = remaining.filter((o) => o.status !== "CANCELLED").reduce((sum, o) => sum.add(o.totalAmount), new Decimal(0));
    await tx.tableSession.update({
      where: { id },
      data: { status: "CLOSED", closeType: "PAID", closedAt: new Date(), closedByUserId: userId, paymentMethod, totalAmount: total },
    });
    for (const o of remaining) {
      if (o.status === "CANCELLED" || o.status === "COMPLETED") continue;
      await tx.order.update({ where: { id: o.id }, data: { status: "COMPLETED" } });
      await tx.orderItem.updateMany({ where: { orderId: o.id, servedAt: null }, data: { servedAt: new Date() } });
      await tx.orderStatusHistory.create({ data: { orderId: o.id, fromStatus: o.status, toStatus: "COMPLETED", changedByUserId: userId } });
    }

    const fresh = await tx.tableSession.create({
      data: {
        restaurantId,
        tableId: session.tableId,
        tableNumberSnapshot: session.tableNumberSnapshot,
        openedAt: session.orders.find((o) => moving.has(o.id))?.createdAt ?? new Date(),
      },
    });
    await tx.order.updateMany({ where: { id: { in: moveOrderIds } }, data: { sessionId: fresh.id, sameGuestsConfirmed: true } });
    return fresh.id;
  });
  return { closed: await getSession(restaurantId, id), newBillId: newSessionId };
}

/**
 * "Clear table": closes the bill WITHOUT payment (guests left, paid elsewhere…). Requires the owner's
 * login password. The amount is kept for the record but excluded from sales and reconciliation totals.
 * Orders the kitchen never accepted are cancelled; the rest are archived as completed.
 */
export async function clearSession(restaurantId: number, userId: number, id: number, password: string, note?: string | null) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(403, "auth.passwordIncorrect", "WRONG_PASSWORD");
  }

  await prisma.$transaction(async (tx) => {
    const session = await tx.tableSession.findFirst({ where: { id, restaurantId }, include: sessionInclude });
    if (!session) throw notFound("session.notFound");
    if (session.status === "CLOSED") throw conflict("session.closed");

    const { count } = await tx.tableSession.updateMany({
      where: { id, status: "OPEN" },
      data: {
        status: "CLOSED",
        closeType: "CLEARED",
        closedAt: new Date(),
        closedByUserId: userId,
        paymentMethod: null,
        closeNote: note ?? null,
        totalAmount: sessionTotal(session),
      },
    });
    if (count === 0) throw conflict("session.closed");

    for (const o of session.orders) {
      if (o.status === "CANCELLED" || o.status === "COMPLETED") continue;
      const to = o.status === "PENDING" ? "CANCELLED" : "COMPLETED";
      await tx.order.update({ where: { id: o.id }, data: { status: to } });
      await tx.orderStatusHistory.create({ data: { orderId: o.id, fromStatus: o.status, toStatus: to, changedByUserId: userId } });
    }
  });
  return getSession(restaurantId, id);
}

/** Local-time day range [from 00:00, to+1 00:00). */
function dayRange(from?: string, to?: string) {
  const today = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const start = new Date(`${from ?? iso(today)}T00:00:00`);
  const end = new Date(`${to ?? from ?? iso(today)}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Closed bills for reconciliation, with totals per payment method. */
export async function listClosedSessions(restaurantId: number, from?: string, to?: string) {
  const { start, end } = dayRange(from, to);
  const sessions = await prisma.tableSession.findMany({
    where: { restaurantId, status: "CLOSED", closedAt: { gte: start, lt: end } },
    orderBy: { closedAt: "desc" },
    include: { orders: { include: { items: true } } },
  });

  const byMethod: Record<PaymentMethod, Decimal> = { CASH: new Decimal(0), CARD: new Decimal(0), OTHER: new Decimal(0) };
  let total = new Decimal(0);
  let paidCount = 0;
  let clearedTotal = new Decimal(0);
  let clearedCount = 0;
  for (const s of sessions) {
    const amount = s.totalAmount ?? new Decimal(0);
    // Cleared tables never collected money: keep them out of the takings.
    if (s.closeType === "CLEARED") {
      clearedTotal = clearedTotal.add(amount);
      clearedCount++;
      continue;
    }
    paidCount++;
    total = total.add(amount);
    if (s.paymentMethod) byMethod[s.paymentMethod] = byMethod[s.paymentMethod].add(amount);
  }

  return {
    from: start,
    to: end,
    count: paidCount,
    total: money(total),
    cleared: { count: clearedCount, total: money(clearedTotal) },
    byMethod: { CASH: money(byMethod.CASH), CARD: money(byMethod.CARD), OTHER: money(byMethod.OTHER) },
    sessions: sessions.map((s) => {
      const { orders: _o, summary: _s, ...rest } = serializeSession({ ...s, orders: s.orders });
      return rest;
    }),
  };
}

/** Tables with their live bill state for the floor overview. */
export async function listTablesWithBills(restaurantId: number) {
  const [tables, open] = await Promise.all([
    prisma.table.findMany({ where: { restaurantId } }),
    prisma.tableSession.findMany({
      where: { restaurantId, status: "OPEN" },
      include: { orders: { include: { items: true } } },
    }),
  ]);
  const byTable = new Map(open.filter((s) => s.tableId).map((s) => [s.tableId!, s]));
  const collator = new Intl.Collator("zh-CN", { numeric: true });
  return tables
    .sort((a, b) => collator.compare(a.tableNumber, b.tableNumber))
    .map((t) => {
      const s = byTable.get(t.id);
      const active = s?.orders.filter((o) => o.status !== "CANCELLED") ?? [];
      return {
        ...serializeTable(t),
        bill: s
          ? {
              id: s.id,
              openedAt: s.openedAt,
              totalAmount: money(sessionTotal(s)),
              orderCount: active.length,
              itemCount: active.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0),
              pendingCount: s.orders.filter((o) => o.status === "PENDING").length,
              // Dishes ordered but not yet ticked as served.
              waitingItems: active.reduce((n, o) => n + o.items.filter((i) => !i.servedAt).reduce((m, i) => m + i.quantity, 0), 0),
              newGuestsHint: s.orders.some((o) => billContext(o, s).newGuestsHint),
            }
          : null,
      };
    });
}
