import { OrderStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import type { Lang } from "../i18n";
import { prisma } from "../utils/prisma";
import { badRequest, conflict, notFound } from "../utils/http";
import { Decimal } from "../utils/money";
import { newOrderPublicId } from "../utils/tokens";
import { createOrderSchema, orderListQuery } from "../validators/order";
import { resolveTable } from "./public.service";
import { serializeOrder, serializePublicOrder } from "./serializers";

/**
 * Kitchen flow:
 *   PENDING ──accept──▶ PREPARING ──tick dishes──▶ SERVING ──tick the rest──▶ SERVED
 * SERVING / SERVED are derived from per-dish ticks, so staff only ever "accept" and "tick".
 * COMPLETED is set when the bill is closed; CANCELLED is allowed until a dish has been served.
 */
export const ACTIVE_STATUSES: OrderStatus[] = ["PENDING", "PREPARING", "SERVING", "SERVED"];
export const KITCHEN_STATUSES: OrderStatus[] = ["PENDING", "PREPARING", "SERVING"];
const CANCELLABLE: OrderStatus[] = ["PENDING", "PREPARING"];

/** Sibling orders on the same bill, so each order knows "add-on #2, bill total". */
export const billInclude = {
  session: { select: { status: true, orders: { include: { items: { select: { servedAt: true } } } } } },
} satisfies Prisma.OrderInclude;

const detailInclude = {
  items: { orderBy: { id: "asc" } },
  statusHistory: { orderBy: { createdAt: "asc" } },
  ...billInclude,
} satisfies Prisma.OrderInclude;

/**
 * Creates an order from a cart and attaches it to the table's open bill (opening one if needed).
 * The client only sends product ids + quantities; restaurant, table, names and prices all come from the database.
 */
export async function createOrder(input: z.infer<typeof createOrderSchema>, lang: Lang = "zh") {
  const table = await resolveTable(input.qrToken, input.restaurantSlug);

  // Merge duplicate lines.
  const quantities = new Map<number, number>();
  for (const { productId, quantity } of input.items) {
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }
  for (const q of quantities.values()) if (q > 50) throw badRequest("order.maxQty");

  const products = await prisma.product.findMany({
    where: { id: { in: [...quantities.keys()] }, restaurantId: table.restaurantId, deletedAt: null },
    include: { category: { select: { isActive: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const unavailable: { productId: number; name: string | null }[] = [];
  for (const productId of quantities.keys()) {
    const p = byId.get(productId);
    // Name the dish in the diner's language.
    const name = p ? ((lang === "en" && p.nameEn) || (lang === "fr" && p.nameFr) || p.name) : null;
    if (!p || !p.isAvailable || !p.category.isActive) unavailable.push({ productId, name });
  }
  if (unavailable.length) {
    const names = unavailable.map((u) => u.name).filter(Boolean).join(", ");
    throw names
      ? conflict("order.unavailable", { names }, { unavailable }, "UNAVAILABLE")
      : conflict("order.unavailableGeneric", {}, { unavailable }, "UNAVAILABLE");
  }

  let total = new Decimal(0);
  const items = [...quantities.entries()].map(([productId, quantity]) => {
    const p = byId.get(productId)!;
    const lineTotal = p.price.mul(quantity);
    total = total.add(lineTotal);
    return {
      productId,
      productNameSnapshot: p.name,
      productNameEnSnapshot: p.nameEn,
      productNameFrSnapshot: p.nameFr,
      unitPriceSnapshot: p.price,
      quantity,
      totalPrice: lineTotal,
    };
  });

  const status: OrderStatus = table.restaurant.autoAcceptOrders ? "PREPARING" : "PENDING";

  const order = await prisma.$transaction(async (tx) => {
    // The UPDATE row-locks the restaurant, serialising order numbers and the open-bill lookup below
    // so two phones ordering at the same moment can't open two bills for one table.
    const { nextOrderNumber } = await tx.restaurant.update({
      where: { id: table.restaurantId },
      data: { nextOrderNumber: { increment: 1 } },
      select: { nextOrderNumber: true },
    });
    const session =
      (await tx.tableSession.findFirst({ where: { tableId: table.id, status: "OPEN" }, orderBy: { openedAt: "desc" } })) ??
      (await tx.tableSession.create({
        data: { restaurantId: table.restaurantId, tableId: table.id, tableNumberSnapshot: table.tableNumber },
      }));
    await tx.tableSession.update({ where: { id: session.id }, data: { updatedAt: new Date() } });

    return tx.order.create({
      data: {
        publicId: newOrderPublicId(),
        restaurantId: table.restaurantId,
        tableId: table.id,
        sessionId: session.id,
        tableNumberSnapshot: table.tableNumber,
        orderNumber: nextOrderNumber - 1,
        status,
        currency: table.restaurant.currency,
        totalAmount: total,
        note: input.note ?? null,
        items: { create: items },
        statusHistory: {
          create:
            status === "PENDING"
              ? [{ fromStatus: null, toStatus: "PENDING" }]
              : [{ fromStatus: null, toStatus: "PENDING" }, { fromStatus: "PENDING", toStatus: "PREPARING" }],
        },
      },
      include: { items: true, restaurant: true },
    });
  });

  return serializePublicOrder(order);
}

export async function getPublicOrder(publicId: string) {
  const order = await prisma.order.findUnique({
    where: { publicId },
    include: { items: { orderBy: { id: "asc" } }, restaurant: true },
  });
  if (!order) throw notFound("order.notFound");
  return serializePublicOrder(order);
}

// ---------- Admin ----------

export async function listOrders(restaurantId: number, query: z.infer<typeof orderListQuery>) {
  const where: Prisma.OrderWhereInput = { restaurantId };
  if (query.status === "ACTIVE") where.status = { in: ACTIVE_STATUSES };
  else if (query.status === "KITCHEN") where.status = { in: KITCHEN_STATUSES };
  else if (query.status !== "ALL") where.status = query.status;

  const orders = await prisma.order.findMany({
    where,
    // The kitchen works oldest-first; history views show newest first.
    orderBy: { createdAt: query.status === "KITCHEN" || query.status === "PENDING" ? "asc" : "desc" },
    take: query.limit,
    include: { items: { orderBy: { id: "asc" } }, ...billInclude },
  });
  return orders.map((o) => serializeOrder(o, o.session));
}

export async function getOrder(restaurantId: number, id: number) {
  const order = await prisma.order.findFirst({ where: { id, restaurantId }, include: detailInclude });
  if (!order) throw notFound("order.notFound");
  return serializeOrder(order, order.session);
}

/** Dismisses the "new guests?" hint: this order really is an add-on for the same table. */
export async function confirmSameGuests(restaurantId: number, id: number) {
  const { count } = await prisma.order.updateMany({ where: { id, restaurantId }, data: { sameGuestsConfirmed: true } });
  if (!count) throw notFound("order.notFound");
  return getOrder(restaurantId, id);
}

type Tx = Prisma.TransactionClient;

async function lockOrder(tx: Tx, restaurantId: number, id: number) {
  const order = await tx.order.findFirst({ where: { id, restaurantId }, include: { items: true } });
  if (!order) throw notFound("order.notFound");
  return order;
}

/** Conditional update guards against two devices changing the same order at once. */
async function moveStatus(tx: Tx, orderId: number, from: OrderStatus, to: OrderStatus, userId: number | null) {
  if (from === to) return;
  const { count } = await tx.order.updateMany({ where: { id: orderId, status: from }, data: { status: to } });
  if (count === 0) throw conflict("order.concurrent");
  await tx.orderStatusHistory.create({ data: { orderId, fromStatus: from, toStatus: to, changedByUserId: userId } });
}

/** Status implied by the per-dish ticks for an accepted order. */
function derivedStatus(items: { servedAt: Date | null }[]): OrderStatus {
  const served = items.filter((i) => i.servedAt).length;
  if (served === 0) return "PREPARING";
  return served === items.length ? "SERVED" : "SERVING";
}

/** Manual transitions: accept (→ PREPARING) or cancel. */
export async function updateOrderStatus(restaurantId: number, userId: number, id: number, status: "PREPARING" | "CANCELLED") {
  await prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, restaurantId, id);
    if (order.status === status) return;
    const allowed = status === "PREPARING" ? order.status === "PENDING" : CANCELLABLE.includes(order.status);
    if (!allowed) throw conflict("order.badTransition");
    await moveStatus(tx, id, order.status, status, userId);
  });
  return getOrder(restaurantId, id);
}

export async function acceptOrders(restaurantId: number, userId: number, ids: number[]) {
  await prisma.$transaction(async (tx) => {
    const pending = await tx.order.findMany({ where: { id: { in: ids }, restaurantId, status: "PENDING" }, select: { id: true } });
    for (const { id } of pending) await moveStatus(tx, id, "PENDING", "PREPARING", userId);
  });
  return { accepted: ids.length };
}

/** Ticks / unticks one dish and re-derives the order status. Ticking a new order implicitly accepts it. */
export async function setItemServed(restaurantId: number, userId: number, orderId: number, itemId: number, served: boolean) {
  await prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, restaurantId, orderId);
    if (!["PENDING", "PREPARING", "SERVING", "SERVED"].includes(order.status)) throw conflict("order.badTransition");
    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw notFound("order.notFound");

    const servedAt = served ? (item.servedAt ?? new Date()) : null;
    await tx.orderItem.update({ where: { id: itemId }, data: { servedAt } });

    let from = order.status;
    if (from === "PENDING") {
      await moveStatus(tx, orderId, "PENDING", "PREPARING", userId);
      from = "PREPARING";
    }
    const items = order.items.map((i) => (i.id === itemId ? { servedAt } : i));
    await moveStatus(tx, orderId, from, derivedStatus(items), userId);
  });
  return getOrder(restaurantId, orderId);
}

/** "All served" shortcut. */
export async function serveAll(restaurantId: number, userId: number, orderId: number) {
  await prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, restaurantId, orderId);
    if (!["PENDING", "PREPARING", "SERVING"].includes(order.status)) throw conflict("order.badTransition");
    await tx.orderItem.updateMany({ where: { orderId, servedAt: null }, data: { servedAt: new Date() } });
    let from = order.status;
    if (from === "PENDING") {
      await moveStatus(tx, orderId, "PENDING", "PREPARING", userId);
      from = "PREPARING";
    }
    await moveStatus(tx, orderId, from, "SERVED", userId);
  });
  return getOrder(restaurantId, orderId);
}
