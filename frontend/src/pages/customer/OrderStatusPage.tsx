import { Navigate } from "react-router-dom";
import { useTableParams } from "@/features/customer/useTableParams";

/** Old per-order links now open the table's single order view. */
export default function OrderStatusPage() {
  const { base } = useTableParams();
  return <Navigate to={`${base}/bill`} replace />;
}
