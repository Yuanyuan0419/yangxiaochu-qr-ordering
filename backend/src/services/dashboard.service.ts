import { prisma } from "../utils/prisma";
import { money, Decimal } from "../utils/money";
import { billInclude } from "./order.service";
import { serializeOrder } from "./serializers";

export async function getDashboard(restaurantId: number) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  // Sales exclude bills that were cleared without payment.
  const today = {
    restaurantId,
    createdAt: { gte: startOfDay },
    session: { OR: [{ closeType: null }, { closeType: "PAID" as const }] },
  };

  const [todayOrders, revenue, pendingOrders, kitchenOrders, openBills, paidToday, recent] = await Promise.all([
    prisma.order.count({ where: { ...today, status: { not: "CANCELLED" } } }),
    prisma.order.aggregate({ where: { ...today, status: { not: "CANCELLED" } }, _sum: { totalAmount: true } }),
    // Not limited to today: anything still waiting needs attention.
    prisma.order.count({ where: { restaurantId, status: "PENDING" } }),
    prisma.order.count({ where: { restaurantId, status: { in: ["PREPARING", "SERVING"] } } }),
    prisma.tableSession.count({ where: { restaurantId, status: "OPEN" } }),
    prisma.tableSession.aggregate({
      where: { restaurantId, status: "CLOSED", closeType: "PAID", closedAt: { gte: startOfDay } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.order.findMany({ where: { restaurantId }, orderBy: { createdAt: "desc" }, take: 5, include: { items: true, ...billInclude } }),
  ]);

  return {
    todayOrders,
    todayRevenue: money(revenue._sum.totalAmount ?? new Decimal(0)),
    pendingOrders,
    kitchenOrders,
    openTables: openBills,
    paidToday: money(paidToday._sum.totalAmount ?? new Decimal(0)),
    paidBillsToday: paidToday._count._all,
    recentOrders: recent.map((o) => serializeOrder(o, o.session)),
  };
}
