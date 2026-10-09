import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type {
  Allergen,
  Bill,
  BillHistory,
  Category,
  Dashboard,
  DiningTable,
  Ingredient,
  Order,
  Product,
  ProductInput,
  Restaurant,
  Session,
  TableWithBill,
  User,
} from "@/types";

export const keys = {
  session: ["session"] as const,
  dashboard: ["admin", "dashboard"] as const,
  orders: (status: string) => ["admin", "orders", status] as const,
  order: (id: number) => ["admin", "order", id] as const,
  products: ["admin", "products"] as const,
  product: (id: number) => ["admin", "product", id] as const,
  categories: ["admin", "categories"] as const,
  tables: ["admin", "tables"] as const,
  table: (id: number) => ["admin", "table", id] as const,
  allergens: ["admin", "allergens"] as const,
  ingredients: ["admin", "ingredients"] as const,
  bills: (date: string) => ["admin", "bills", date] as const,
  bill: (id: number) => ["admin", "bill", id] as const,
  restaurant: ["admin", "restaurant"] as const,
  profile: ["admin", "profile"] as const,
};

// ---------- Session ----------
export function useSession() {
  return useQuery({ queryKey: keys.session, queryFn: () => api.get<Session>("/api/auth/me"), retry: false, staleTime: 60_000 });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => api.post<Session>("/api/auth/login", body),
    onSuccess: (session) => qc.setQueryData(keys.session, session),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/auth/logout"),
    onSettled: () => {
      qc.clear();
    },
  });
}

// ---------- Dashboard & orders ----------
export function useDashboard() {
  return useQuery({ queryKey: keys.dashboard, queryFn: () => api.get<Dashboard>("/api/admin/dashboard"), refetchInterval: 10_000 });
}

export function useOrders(status: string, poll = 5000) {
  return useQuery({
    queryKey: keys.orders(status),
    queryFn: () => api.get<Order[]>(`/api/admin/orders?status=${status}`),
    refetchInterval: poll,
  });
}

export function useOrder(id: number) {
  return useQuery({ queryKey: keys.order(id), queryFn: () => api.get<Order>(`/api/admin/orders/${id}`), refetchInterval: 8000 });
}

/** Refreshes every view that shows order / bill state after a kitchen action. */
function useRefreshOrders() {
  const qc = useQueryClient();
  return (order?: Order) => {
    if (order) qc.setQueryData(keys.order(order.id), order);
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    qc.invalidateQueries({ queryKey: ["admin", "bill"] });
    qc.invalidateQueries({ queryKey: ["admin", "table"] });
    qc.invalidateQueries({ queryKey: keys.tables });
    qc.invalidateQueries({ queryKey: keys.dashboard });
  };
}

export function useOrderActions() {
  const refresh = useRefreshOrders();
  return {
    /** Accept (→ PREPARING) or cancel. */
    setStatus: useMutation({
      mutationFn: ({ id, status }: { id: number; status: "PREPARING" | "CANCELLED" }) =>
        api.patch<Order>(`/api/admin/orders/${id}/status`, { status }),
      onSuccess: refresh,
    }),
    acceptMany: useMutation({
      mutationFn: (ids: number[]) => api.post<{ accepted: number }>("/api/admin/orders/accept", { ids }),
      onSuccess: () => refresh(),
    }),
    tickItem: useMutation({
      mutationFn: ({ orderId, itemId, served }: { orderId: number; itemId: number; served: boolean }) =>
        api.patch<Order>(`/api/admin/orders/${orderId}/items/${itemId}`, { served }),
      onSuccess: refresh,
    }),
    confirmSameGuests: useMutation({
      mutationFn: (orderId: number) => api.post<Order>(`/api/admin/orders/${orderId}/same-guests`),
      onSuccess: refresh,
    }),
    serveAll: useMutation({
      mutationFn: (orderId: number) => api.post<Order>(`/api/admin/orders/${orderId}/serve-all`),
      onSuccess: refresh,
    }),
  };
}

// ---------- Bills ----------
/** Frees a table without payment; the server checks the owner's login password. */
export function useClearBill() {
  const refresh = useRefreshOrders();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; password: string; note?: string | null }) => api.post<Bill>(`/api/admin/bills/${id}/clear`, body),
    onSuccess: (bill) => {
      qc.setQueryData(keys.bill(bill.id), bill);
      qc.invalidateQueries({ queryKey: ["admin", "bills"] });
      refresh();
    },
  });
}

/** Checks out the previous guests and moves the given orders to a fresh bill for the new guests. */
export function useSplitBill() {
  const refresh = useRefreshOrders();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; paymentMethod: "CASH" | "CARD" | "OTHER"; moveOrderIds: number[] }) =>
      api.post<{ closed: Bill; newBillId: number }>(`/api/admin/bills/${id}/split`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "bills"] });
      refresh();
    },
  });
}

export function useBill(id: number) {
  return useQuery({ queryKey: keys.bill(id), queryFn: () => api.get<Bill>(`/api/admin/bills/${id}`), refetchInterval: 8000 });
}

export function useBillHistory(date: string) {
  return useQuery({ queryKey: keys.bills(date), queryFn: () => api.get<BillHistory>(`/api/admin/bills?from=${date}&to=${date}`) });
}

export function useCloseBill() {
  const refresh = useRefreshOrders();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paymentMethod }: { id: number; paymentMethod: "CASH" | "CARD" | "OTHER" }) =>
      api.post<Bill>(`/api/admin/bills/${id}/close`, { paymentMethod }),
    onSuccess: (bill) => {
      qc.setQueryData(keys.bill(bill.id), bill);
      qc.invalidateQueries({ queryKey: ["admin", "bills"] });
      refresh();
    },
  });
}

// ---------- Menu ----------
export function useProducts() {
  return useQuery({ queryKey: keys.products, queryFn: () => api.get<Product[]>("/api/admin/products") });
}

export function useProduct(id: number | null) {
  return useQuery({
    queryKey: keys.product(id ?? 0),
    queryFn: () => api.get<Product>(`/api/admin/products/${id}`),
    enabled: !!id,
  });
}

export function useSaveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: Partial<ProductInput> }) =>
      id ? api.patch<Product>(`/api/admin/products/${id}`, data) : api.post<Product>("/api/admin/products", data),
    onSuccess: (product) => {
      qc.setQueryData(keys.product(product.id), product);
      qc.setQueryData<Product[]>(keys.products, (list) => {
        if (!list) return list;
        const exists = list.some((p) => p.id === product.id);
        return exists ? list.map((p) => (p.id === product.id ? product : p)) : [...list, product];
      });
      qc.invalidateQueries({ queryKey: keys.products });
      qc.invalidateQueries({ queryKey: keys.categories });
      qc.invalidateQueries({ queryKey: keys.ingredients });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/products/${id}`),
    onSuccess: (_d, id) => {
      qc.setQueryData<Product[]>(keys.products, (list) => list?.filter((p) => p.id !== id));
      qc.invalidateQueries({ queryKey: keys.categories });
    },
  });
}

export function useAllergens() {
  return useQuery({ queryKey: keys.allergens, queryFn: () => api.get<Allergen[]>("/api/admin/allergens"), staleTime: Infinity });
}

export function useIngredients() {
  return useQuery({
    queryKey: keys.ingredients,
    queryFn: () => api.get<(Ingredient & { productCount: number })[]>("/api/admin/ingredients"),
    staleTime: 30_000,
  });
}

export function useIngredientMutations() {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: keys.ingredients });
    qc.invalidateQueries({ queryKey: keys.products });
  };
  return {
    update: useMutation({
      mutationFn: ({ id, ...data }: { id: number; nameEn?: string | null; nameFr?: string | null }) =>
        api.patch<Ingredient>(`/api/admin/ingredients/${id}`, data),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: number) => api.delete(`/api/admin/ingredients/${id}`), onSuccess: refresh }),
  };
}

export function useCategories() {
  return useQuery({ queryKey: keys.categories, queryFn: () => api.get<Category[]>("/api/admin/categories") });
}

export function useCategoryMutations() {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: keys.categories });
    qc.invalidateQueries({ queryKey: keys.products });
  };
  return {
    create: useMutation({
      mutationFn: (data: Partial<Category>) => api.post<Category>("/api/admin/categories", data),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, ...data }: Partial<Category> & { id: number }) => api.patch<Category>(`/api/admin/categories/${id}`, data),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: number) => api.delete(`/api/admin/categories/${id}`), onSuccess: refresh }),
    reorder: useMutation({
      mutationFn: (ids: number[]) => api.patch<Category[]>("/api/admin/categories/reorder", { ids }),
      onMutate: async (ids) => {
        await qc.cancelQueries({ queryKey: keys.categories });
        const prev = qc.getQueryData<Category[]>(keys.categories);
        if (prev) qc.setQueryData(keys.categories, ids.map((id) => prev.find((c) => c.id === id)!).filter(Boolean));
        return { prev };
      },
      onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(keys.categories, ctx.prev),
      onSettled: refresh,
    }),
  };
}

// ---------- Tables ----------
export function useTables() {
  return useQuery({ queryKey: keys.tables, queryFn: () => api.get<TableWithBill[]>("/api/admin/tables"), refetchInterval: 8000 });
}

/** A table with its current open bill (null when free). */
export function useTable(id: number) {
  return useQuery({
    queryKey: keys.table(id),
    queryFn: () => api.get<{ table: DiningTable; session: Bill | null }>(`/api/admin/tables/${id}`),
    refetchInterval: 8000,
  });
}

export function useTableMutations() {
  const qc = useQueryClient();
  const refresh = (t?: DiningTable) => {
    if (t) qc.invalidateQueries({ queryKey: keys.table(t.id) });
    qc.invalidateQueries({ queryKey: keys.tables });
  };
  return {
    create: useMutation({ mutationFn: (data: { tableNumber: string }) => api.post<DiningTable>("/api/admin/tables", data), onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({ id, ...data }: { id: number; tableNumber?: string; isActive?: boolean }) => api.patch<DiningTable>(`/api/admin/tables/${id}`, data),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: number) => api.delete(`/api/admin/tables/${id}`), onSuccess: () => refresh() }),
    regenerate: useMutation({ mutationFn: (id: number) => api.post<DiningTable>(`/api/admin/tables/${id}/regenerate-qr`), onSuccess: refresh }),
  };
}

// ---------- Restaurant & profile ----------
export function useRestaurant() {
  return useQuery({ queryKey: keys.restaurant, queryFn: () => api.get<Restaurant>("/api/admin/restaurant") });
}

export function useRestaurantMutations() {
  const qc = useQueryClient();
  const apply = (r: Restaurant) => {
    qc.setQueryData(keys.restaurant, r);
    qc.setQueryData<Session>(keys.session, (s) => (s ? { ...s, restaurant: r } : s));
  };
  return {
    update: useMutation({ mutationFn: (data: Partial<Restaurant>) => api.patch<Restaurant>("/api/admin/restaurant", data), onSuccess: apply }),
    uploadLogo: useMutation({ mutationFn: (file: File) => api.upload<Restaurant>("/api/admin/restaurant/logo", file), onSuccess: apply }),
    removeLogo: useMutation({ mutationFn: () => api.delete<Restaurant>("/api/admin/restaurant/logo"), onSuccess: apply }),
  };
}

export function useProfileMutations() {
  const qc = useQueryClient();
  return {
    update: useMutation({
      mutationFn: (data: { displayName?: string; email?: string }) => api.patch<User>("/api/admin/profile", data),
      onSuccess: (user) => qc.setQueryData<Session>(keys.session, (s) => (s ? { ...s, user } : s)),
    }),
    password: useMutation({
      mutationFn: (data: { currentPassword: string; newPassword: string }) => api.patch("/api/admin/password", data),
    }),
  };
}

export const uploadProductImage = (file: File) => api.upload<{ url: string }>("/api/admin/uploads/product-image", file);

// ---------- Translation (DeepL) ----------
export type TranslateKind = "dish" | "category" | "ingredient" | "restaurant" | "hours";

export function useTranslateStatus() {
  return useQuery({
    queryKey: ["admin", "translate-status"],
    queryFn: () => api.get<{ enabled: boolean; missing: number }>("/api/admin/translate/status"),
    staleTime: 30_000,
  });
}

export function useTranslate() {
  return useMutation({
    mutationFn: (body: { texts: string[]; kind: TranslateKind }) => api.post<{ en: string[]; fr: string[] }>("/api/admin/translate", body),
  });
}

/** Fills every empty EN/FR field across the menu. */
export function useTranslateMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ fields: number; records: number }>("/api/admin/translate/menu"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: keys.session });
    },
  });
}
