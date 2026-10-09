import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Menu, PublicBill, PublicOrder } from "@/types";

export const menuKey = (slug: string, token: string) => ["menu", slug, token] as const;

export function useMenu(slug: string, token: string) {
  return useQuery({
    queryKey: menuKey(slug, token),
    queryFn: () => api.get<Menu>(`/api/public/menu/${encodeURIComponent(slug)}/${encodeURIComponent(token)}`),
    staleTime: 30_000,
    // Owners edit prices/availability live; pick that up without a manual refresh.
    refetchInterval: 60_000,
  });
}

const TERMINAL = new Set(["COMPLETED", "CANCELLED"]);

export function usePublicOrder(publicId: string) {
  return useQuery({
    queryKey: ["public-order", publicId],
    queryFn: () => api.get<PublicOrder>(`/api/public/orders/${encodeURIComponent(publicId)}`),
    refetchInterval: (q) => (q.state.data && TERMINAL.has(q.state.data.status) ? false : 4000),
    refetchIntervalInBackground: false,
  });
}

export const billKey = (slug: string, token: string) => ["table-bill", slug, token] as const;

/** Everything this table has ordered during the current visit. */
export function useTableBill(slug: string, token: string, poll = 6000) {
  return useQuery({
    queryKey: billKey(slug, token),
    queryFn: () =>
      api.get<{ session: PublicBill | null }>(`/api/public/bill/${encodeURIComponent(slug)}/${encodeURIComponent(token)}`),
    refetchInterval: poll,
    refetchIntervalInBackground: false,
  });
}

export function usePlaceOrder() {
  return useMutation({
    mutationFn: (body: {
      restaurantSlug: string;
      qrToken: string;
      items: { productId: number; quantity: number }[];
      note?: string | null;
    }) => api.post<PublicOrder>("/api/public/orders", body),
  });
}
