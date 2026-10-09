export type OrderStatus = "PENDING" | "PREPARING" | "SERVING" | "SERVED" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "CASH" | "CARD" | "OTHER";

/** Base (Chinese) text plus optional EN/FR translations. */
export interface I18nName {
  name: string;
  nameEn: string | null;
  nameFr: string | null;
}
export interface I18nDescription {
  description: string | null;
  descriptionEn: string | null;
  descriptionFr: string | null;
}

export interface Allergen extends I18nName {
  id: number;
  code: string;
  nameEn: string;
  nameFr: string;
}

export interface Ingredient extends I18nName {
  id: number;
}

export interface Product extends I18nName, I18nDescription {
  id: number;
  categoryId: number;
  categoryName?: string;
  /** Decimal as a fixed 2-decimal string, e.g. "12.50". */
  price: string;
  currency: string;
  imageUrl: string | null;
  isAvailable: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isSpicy: boolean;
  isGlutenFree: boolean;
  sortOrder: number;
  ingredients: Ingredient[];
  allergens: Allergen[];
}

export interface PublicRestaurant extends I18nName, I18nDescription {
  slug: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  openingHours: string | null;
  openingHoursEn: string | null;
  openingHoursFr: string | null;
  currency: string;
  defaultLanguage: string;
}

export interface Restaurant extends PublicRestaurant {
  id: number;
  autoAcceptOrders: boolean;
}

export interface MenuCategory extends I18nName, I18nDescription {
  id: number;
  products: Product[];
}

export interface Menu {
  restaurant: PublicRestaurant;
  table: { tableNumber: string; qrToken: string };
  categories: MenuCategory[];
}

export interface OrderItem extends I18nName {
  id?: number;
  productId?: number | null;
  unitPrice: string;
  quantity: number;
  totalPrice: string;
  servedAt: string | null;
}

export interface OrderBillContext {
  sessionId: number;
  /** 1-based position of this order on its table's bill; > 1 means an add-on. */
  index: number;
  count: number;
  total: string;
  status: "OPEN" | "CLOSED";
  /** Earlier dishes were all served a while ago and the bill is still open: maybe new guests. */
  newGuestsHint: boolean;
  previousServedAt: string | null;
}

export interface Order {
  bill?: OrderBillContext;
  id: number;
  publicId: string;
  sessionId: number;
  orderNumber: number;
  tableNumber: string;
  status: OrderStatus;
  currency: string;
  totalAmount: string;
  note: string | null;
  itemCount: number;
  items: OrderItem[];
  statusHistory?: { from: OrderStatus | null; to: OrderStatus; at: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicOrder extends Omit<Order, "id" | "sessionId" | "statusHistory" | "bill"> {
  restaurant: I18nName & { slug: string; logoUrl: string | null };
}

export interface BillLine extends I18nName {
  unitPrice: string;
  quantity: number;
  servedQuantity: number;
  totalPrice: string;
}

export interface Bill {
  id: number;
  tableId: number | null;
  tableNumber: string;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  paymentMethod: PaymentMethod | null;
  /** PAID at checkout, or CLEARED by the owner without payment. */
  closeType: "PAID" | "CLEARED" | null;
  closeNote: string | null;
  totalAmount: string;
  orderCount: number;
  itemCount: number;
  pendingCount: number;
  summary: BillLine[];
  orders: Order[];
}

export type PublicBill = Omit<Bill, "id" | "tableId" | "orders"> & { orders: Omit<PublicOrder, "restaurant">[] };

export type BillListItem = Omit<Bill, "summary" | "orders">;

export interface BillHistory {
  from: string;
  to: string;
  count: number;
  total: string;
  byMethod: Record<PaymentMethod, string>;
  cleared: { count: number; total: string };
  sessions: BillListItem[];
}

export interface User {
  id: number;
  email: string;
  displayName: string;
  role: "OWNER" | "ADMIN";
}

export interface Session {
  user: User;
  restaurant: Restaurant;
}

export interface Category extends I18nName, I18nDescription {
  id: number;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export interface DiningTable {
  id: number;
  tableNumber: string;
  qrToken: string;
  isActive: boolean;
  createdAt: string;
}

export interface TableWithBill extends DiningTable {
  bill: {
    id: number;
    openedAt: string;
    totalAmount: string;
    orderCount: number;
    itemCount: number;
    pendingCount: number;
    waitingItems: number;
    newGuestsHint: boolean;
  } | null;
}

export interface Dashboard {
  todayOrders: number;
  todayRevenue: string;
  pendingOrders: number;
  kitchenOrders: number;
  openTables: number;
  paidToday: string;
  paidBillsToday: number;
  recentOrders: Order[];
}

export interface ProductInput extends I18nName, I18nDescription {
  categoryId: number;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isSpicy: boolean;
  isGlutenFree: boolean;
  ingredients: string[];
  allergenIds: number[];
}
