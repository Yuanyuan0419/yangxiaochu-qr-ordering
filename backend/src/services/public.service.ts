import { prisma } from "../utils/prisma";
import { notFound } from "../utils/http";
import {
  productInclude,
  serializeCategory,
  serializeProduct,
  serializePublicRestaurant,
  serializePublicSession,
} from "./serializers";

export async function getRestaurantBySlug(slug: string) {
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) throw notFound("restaurant.notFound");
  return serializePublicRestaurant(restaurant);
}

/** Resolves a scanned QR token to its active table + restaurant. */
export async function resolveTable(qrToken: string, restaurantSlug?: string) {
  const table = await prisma.table.findUnique({ where: { qrToken }, include: { restaurant: true } });
  if (!table || (restaurantSlug && table.restaurant.slug !== restaurantSlug)) throw notFound("table.invalidQr");
  if (!table.isActive) throw notFound("table.inactive");
  return table;
}

export async function getTable(qrToken: string) {
  const table = await resolveTable(qrToken);
  return {
    table: { tableNumber: table.tableNumber, qrToken: table.qrToken },
    restaurant: serializePublicRestaurant(table.restaurant),
  };
}

export async function getMenu(restaurantSlug: string, qrToken: string) {
  const table = await resolveTable(qrToken, restaurantSlug);
  const categories = await prisma.category.findMany({
    where: { restaurantId: table.restaurantId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      products: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: productInclude,
      },
    },
  });

  return {
    restaurant: serializePublicRestaurant(table.restaurant),
    table: { tableNumber: table.tableNumber, qrToken: table.qrToken },
    categories: categories
      .filter((c) => c.products.length > 0)
      .map((c) => ({ ...serializeCategory(c), products: c.products.map(serializeProduct) })),
  };
}

export async function getPublicProduct(id: number) {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null, category: { isActive: true } },
    include: productInclude,
  });
  if (!product) throw notFound("product.notFound");
  return serializeProduct(product);
}

/** The table's current open bill (everything ordered this visit), or null if the table is free. */
export async function getTableBill(restaurantSlug: string, qrToken: string) {
  const table = await resolveTable(qrToken, restaurantSlug);
  const session = await prisma.tableSession.findFirst({
    where: { tableId: table.id, status: "OPEN" },
    orderBy: { openedAt: "desc" },
    include: { orders: { orderBy: { createdAt: "asc" }, include: { items: { orderBy: { id: "asc" } } } } },
  });
  return { session: session ? serializePublicSession(session) : null };
}
