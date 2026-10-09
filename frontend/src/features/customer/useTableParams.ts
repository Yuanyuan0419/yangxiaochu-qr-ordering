import { useParams } from "react-router-dom";
import { menuPath } from "@/utils/url";

export function useTableParams() {
  const { restaurantSlug = "", qrToken = "" } = useParams();
  return { slug: restaurantSlug, token: qrToken, cartKey: `${restaurantSlug}/${qrToken}`, base: menuPath(restaurantSlug, qrToken) };
}
