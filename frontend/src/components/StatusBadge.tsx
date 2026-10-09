import { Badge, type BadgeProps } from "@/components/ui/badge";
import { useT } from "@/i18n";
import type { OrderStatus } from "@/types";
import { statusKey } from "@/utils/format";

const VARIANT: Record<OrderStatus, BadgeProps["variant"]> = {
  PENDING: "default",
  PREPARING: "warning",
  SERVING: "info",
  SERVED: "success",
  COMPLETED: "muted",
  CANCELLED: "outline",
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const { t } = useT();
  return (
    <Badge variant={VARIANT[status]} className={className}>
      {t(statusKey(status))}
    </Badge>
  );
}
