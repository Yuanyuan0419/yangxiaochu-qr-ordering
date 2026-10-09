import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Product } from "@/types";
import { fromCents, toCents } from "@/utils/format";

export interface CartLine {
  productId: number;
  name: string;
  nameEn: string | null;
  nameFr: string | null;
  price: string;
  imageUrl: string | null;
  quantity: number;
}

interface TableCart {
  lines: CartLine[];
  note: string;
}

interface CartState {
  /** Carts are kept per table ("slug/qrToken") so two QR codes never share a basket. */
  carts: Record<string, TableCart>;
  /** Order publicIds placed from each table on this device, newest first. */
  orders: Record<string, string[]>;
  add: (key: string, product: Product, quantity?: number) => void;
  setQuantity: (key: string, productId: number, quantity: number) => void;
  setNote: (key: string, note: string) => void;
  clear: (key: string) => void;
  /** Refresh names/prices from the latest menu and drop products that no longer exist. */
  sync: (key: string, products: Product[]) => void;
  rememberOrder: (key: string, publicId: string) => void;
}

const MAX_QTY = 50;
const empty: TableCart = { lines: [], note: "" };

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      carts: {},
      orders: {},
      add: (key, product, quantity = 1) =>
        set((s) => {
          const cart = s.carts[key] ?? empty;
          const existing = cart.lines.find((l) => l.productId === product.id);
          const lines = existing
            ? cart.lines.map((l) => (l.productId === product.id ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) } : l))
            : [
                ...cart.lines,
                {
                  productId: product.id,
                  name: product.name,
                  nameEn: product.nameEn,
                  nameFr: product.nameFr,
                  price: product.price,
                  imageUrl: product.imageUrl,
                  quantity,
                },
              ];
          return { carts: { ...s.carts, [key]: { ...cart, lines } } };
        }),
      setQuantity: (key, productId, quantity) =>
        set((s) => {
          const cart = s.carts[key] ?? empty;
          const lines =
            quantity <= 0
              ? cart.lines.filter((l) => l.productId !== productId)
              : cart.lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l));
          return { carts: { ...s.carts, [key]: { ...cart, lines } } };
        }),
      setNote: (key, note) => set((s) => ({ carts: { ...s.carts, [key]: { ...(s.carts[key] ?? empty), note } } })),
      clear: (key) => set((s) => ({ carts: { ...s.carts, [key]: empty } })),
      sync: (key, products) =>
        set((s) => {
          const cart = s.carts[key];
          if (!cart?.lines.length) return s;
          const byId = new Map(products.map((p) => [p.id, p]));
          const lines = cart.lines
            .filter((l) => byId.has(l.productId))
            .map((l) => {
              const p = byId.get(l.productId)!;
              return { ...l, name: p.name, nameEn: p.nameEn, nameFr: p.nameFr, price: p.price, imageUrl: p.imageUrl };
            });
          const changed =
            lines.length !== cart.lines.length ||
            lines.some((l, i) => {
              const old = cart.lines[i];
              return l.price !== old.price || l.name !== old.name || l.nameEn !== old.nameEn || l.nameFr !== old.nameFr || l.imageUrl !== old.imageUrl;
            });
          return changed ? { carts: { ...s.carts, [key]: { ...cart, lines } } } : s;
        }),
      rememberOrder: (key, publicId) =>
        set((s) => ({ orders: { ...s.orders, [key]: [publicId, ...(s.orders[key] ?? [])].slice(0, 20) } })),
    }),
    {
      name: "yxc-cart",
      version: 2,
      // v1 lines had no translations; they're refreshed from the menu on the next sync.
      migrate: (state) => {
        const s = state as CartState;
        for (const cart of Object.values(s.carts ?? {})) {
          cart.lines = cart.lines.map((l) => ({ ...l, nameEn: l.nameEn ?? null, nameFr: l.nameFr ?? null }));
        }
        return s;
      },
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function useTableCart(key: string) {
  const cart = useCartStore((s) => s.carts[key]) ?? empty;
  const totalCents = cart.lines.reduce((sum, l) => sum + toCents(l.price) * l.quantity, 0);
  const count = cart.lines.reduce((n, l) => n + l.quantity, 0);
  return { ...cart, count, total: fromCents(totalCents) };
}
