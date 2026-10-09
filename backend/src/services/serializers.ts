import type {
  Allergen,
  Category,
  Ingredient,
  Order,
  OrderItem,
  OrderStatusHistory,
  Prisma,
  Product,
  Restaurant,
  Table,
  TableSession,
  User,
} from "@prisma/client";
import { Decimal, money } from "../utils/money";

export const productInclude = {
  ingredients: { include: { ingredient: true }, orderBy: { sortOrder: "asc" } },
  allergens: { include: { allergen: true } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Product & {
  ingredients: { ingredient: Ingredient }[];
  allergens: { allergen: Allergen }[];
  category?: Category;
};

const i18nName = (x: { name: string; nameEn: string | null; nameFr: string | null }) => ({
  name: x.name,
  nameEn: x.nameEn,
  nameFr: x.nameFr,
});

export const serializeAllergen = (a: Allergen) => ({ id: a.id, code: a.code, name: a.name, nameEn: a.nameEn, nameFr: a.nameFr });

export const serializeIngredient = (i: Ingredient) => ({ id: i.id, ...i18nName(i) });

export function serializeProduct(p: ProductWithRelations) {
  return {
    id: p.id,
    categoryId: p.categoryId,
    categoryName: p.category?.name,
    ...i18nName(p),
    description: p.description,
    descriptionEn: p.descriptionEn,
    descriptionFr: p.descriptionFr,
    price: money(p.price),
    currency: p.currency,
    imageUrl: p.imageUrl,
    isAvailable: p.isAvailable,
    isVegetarian: p.isVegetarian,
    isVegan: p.isVegan,
    isSpicy: p.isSpicy,
    isGlutenFree: p.isGlutenFree,
    sortOrder: p.sortOrder,
    ingredients: p.ingredients.map(({ ingredient }) => serializeIngredient(ingredient)),
    allergens: p.allergens
      .map(({ allergen }) => allergen)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(serializeAllergen),
  };
}

export const serializeCategory = (c: Category) => ({
  id: c.id,
  ...i18nName(c),
  description: c.description,
  descriptionEn: c.descriptionEn,
  descriptionFr: c.descriptionFr,
  sortOrder: c.sortOrder,
  isActive: c.isActive,
});

export const serializePublicRestaurant = (r: Restaurant) => ({
  slug: r.slug,
  ...i18nName(r),
  logoUrl: r.logoUrl,
  description: r.description,
  descriptionEn: r.descriptionEn,
  descriptionFr: r.descriptionFr,
  address: r.address,
  phone: r.phone,
  openingHours: r.openingHours,
  openingHoursEn: r.openingHoursEn,
  openingHoursFr: r.openingHoursFr,
  currency: r.currency,
  defaultLanguage: r.defaultLanguage,
});

export const serializeRestaurant = (r: Restaurant) => ({
  id: r.id,
  ...serializePublicRestaurant(r),
  autoAcceptOrders: r.autoAcceptOrders,
});

export const serializeTable = (t: Table) => ({
  id: t.id,
  tableNumber: t.tableNumber,
  qrToken: t.qrToken,
  isActive: t.isActive,
  createdAt: t.createdAt,
});

export const serializeUser = (u: User) => ({ id: u.id, email: u.email, displayName: u.displayName, role: u.role });

const serializeItem = (i: OrderItem) => ({
  id: i.id,
  productId: i.productId,
  name: i.productNameSnapshot,
  nameEn: i.productNameEnSnapshot,
  nameFr: i.productNameFrSnapshot,
  unitPrice: money(i.unitPriceSnapshot),
  quantity: i.quantity,
  totalPrice: money(i.totalPrice),
  servedAt: i.servedAt,
});

type OrderWithItems = Order & { items: OrderItem[]; statusHistory?: OrderStatusHistory[] };

/** A new order this long after everything earlier on the bill was served may be from new guests. */
export const NEW_GUESTS_GAP_MINUTES = 30;

type BillContextInput = { status: TableSession["status"]; orders: (Order & { items: Pick<OrderItem, "servedAt">[] })[] };

/**
 * Where an order sits on its table's bill ("add-on #2 of 3, bill total"), plus a hint when it looks
 * like new guests sat down at a table whose previous bill was never closed.
 */
export function billContext(o: Order, session: BillContextInput) {
  const sorted = [...session.orders].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id);
  const index = sorted.findIndex((x) => x.id === o.id) + 1;
  const earlier = sorted.slice(0, Math.max(0, index - 1));
  const active = sorted.filter((x) => x.status !== "CANCELLED");
  const total = active.reduce((sum, x) => sum.add(x.totalAmount), new Decimal(0));

  let newGuestsHint = false;
  let lastServedAt: Date | null = null;
  if (index > 1 && session.status === "OPEN" && !o.sameGuestsConfirmed && !["COMPLETED", "CANCELLED"].includes(o.status)) {
    const earlierActive = earlier.filter((x) => x.status !== "CANCELLED");
    const allServed = earlierActive.length > 0 && earlierActive.every((x) => x.status === "SERVED");
    for (const x of earlierActive) {
      for (const i of x.items) if (i.servedAt && (!lastServedAt || i.servedAt > lastServedAt)) lastServedAt = i.servedAt;
    }
    newGuestsHint = allServed && !!lastServedAt && o.createdAt.getTime() - lastServedAt.getTime() >= NEW_GUESTS_GAP_MINUTES * 60_000;
  }

  return {
    sessionId: o.sessionId,
    index,
    count: sorted.length,
    total: money(total),
    status: session.status,
    newGuestsHint,
    previousServedAt: newGuestsHint ? lastServedAt : null,
  };
}

export function serializeOrder(o: OrderWithItems, session?: BillContextInput) {
  return {
    bill: session ? billContext(o, session) : undefined,
    id: o.id,
    publicId: o.publicId,
    sessionId: o.sessionId,
    orderNumber: o.orderNumber,
    tableNumber: o.tableNumberSnapshot,
    status: o.status,
    currency: o.currency,
    totalAmount: money(o.totalAmount),
    note: o.note,
    itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
    items: o.items.map(serializeItem),
    statusHistory: o.statusHistory?.map((h) => ({ from: h.fromStatus, to: h.toStatus, at: h.createdAt })),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

/** Customer-facing order view: omits internal ids. */
export function serializePublicOrder(o: OrderWithItems & { restaurant: Restaurant }) {
  const { id: _id, sessionId: _s, statusHistory: _h, bill: _b, ...rest } = serializeOrder(o);
  return {
    ...rest,
    items: rest.items.map(({ id: _i, productId: _p, ...item }) => item),
    restaurant: { ...i18nName(o.restaurant), slug: o.restaurant.slug, logoUrl: o.restaurant.logoUrl },
  };
}

type SessionWithOrders = TableSession & { orders: OrderWithItems[] };

/** Sum of non-cancelled orders. Closed bills use the total frozen at checkout. */
export function sessionTotal(s: SessionWithOrders) {
  if (s.status === "CLOSED" && s.totalAmount) return s.totalAmount;
  return s.orders.filter((o) => o.status !== "CANCELLED").reduce((sum, o) => sum.add(o.totalAmount), new Decimal(0));
}

/** Merges identical dishes (same name + unit price) across all orders of a bill, for the receipt view. */
function summarise(orders: OrderWithItems[]) {
  const lines = new Map<string, { name: string; nameEn: string | null; nameFr: string | null; unitPrice: Decimal; quantity: number; servedQuantity: number }>();
  for (const o of orders) {
    if (o.status === "CANCELLED") continue;
    for (const i of o.items) {
      const key = `${i.productNameSnapshot}|${i.unitPriceSnapshot.toFixed(2)}`;
      const line = lines.get(key) ?? {
        name: i.productNameSnapshot,
        nameEn: i.productNameEnSnapshot,
        nameFr: i.productNameFrSnapshot,
        unitPrice: i.unitPriceSnapshot,
        quantity: 0,
        servedQuantity: 0,
      };
      line.quantity += i.quantity;
      if (i.servedAt) line.servedQuantity += i.quantity;
      lines.set(key, line);
    }
  }
  return [...lines.values()].map((l) => ({
    ...l,
    unitPrice: money(l.unitPrice),
    totalPrice: money(l.unitPrice.mul(l.quantity)),
  }));
}

export function serializeSession(s: SessionWithOrders) {
  const active = s.orders.filter((o) => o.status !== "CANCELLED");
  return {
    id: s.id,
    tableId: s.tableId,
    tableNumber: s.tableNumberSnapshot,
    status: s.status,
    openedAt: s.openedAt,
    closedAt: s.closedAt,
    paymentMethod: s.paymentMethod,
    closeType: s.closeType,
    closeNote: s.closeNote,
    totalAmount: money(sessionTotal(s)),
    orderCount: active.length,
    itemCount: active.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0),
    pendingCount: s.orders.filter((o) => o.status === "PENDING").length,
    summary: summarise(s.orders),
    orders: s.orders.map((o) => serializeOrder(o, s)),
  };
}

/** What diners at the table may see: their table's current bill, without internal ids. */
export function serializePublicSession(s: SessionWithOrders) {
  const { id: _id, tableId: _t, orders, ...rest } = serializeSession(s);
  return {
    ...rest,
    orders: orders.map(({ id: _i, sessionId: _s, statusHistory: _h, bill: _b, items, ...o }) => ({
      ...o,
      items: items.map(({ id: _x, productId: _p, ...item }) => item),
    })),
  };
}
