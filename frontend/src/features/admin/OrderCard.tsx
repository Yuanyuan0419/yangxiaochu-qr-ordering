import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { AddOnBadge, BillTotalLink } from "./BillContext";
import { useLocalized, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";
import { formatPrice, formatTime, timeAgo } from "@/utils/format";

/** Compact order row for lists and history. */
export function OrderCard({ order }: { order: Order }) {
  const { t } = useT();
  const l = useLocalized();
  const pending = order.status === "PENDING";
  const summary = order.items.map((i) => `${l(i)} ×${i.quantity}`).join(", ");
  return (
    <Link
      to={`/admin/orders/${order.id}`}
      className={cn(
        "press relative flex gap-3 overflow-hidden rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border/60",
        pending && "ring-2 ring-primary/40",
      )}
    >
      {pending && <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />}
      <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-secondary">
        <span className="text-[10px] font-medium text-muted-foreground">{t("common.table")}</span>
        <span className="tabular -mt-1 text-xl font-bold">{order.tableNumber}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="tabular font-bold">#{order.orderNumber}</span>
          <StatusBadge status={order.status} />
          <AddOnBadge order={order} />
          {order.bill?.newGuestsHint && <Badge variant="warning">{t("a.newGuests.short")}</Badge>}
          <span className="tabular ml-auto text-sm text-muted-foreground">{formatTime(order.createdAt)}</span>
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{summary}</p>
        <div className="mt-1.5 flex items-center gap-2 text-sm">
          <span className={cn("tabular font-semibold", order.status === "CANCELLED" && "text-muted-foreground line-through")}>
            {formatPrice(order.totalAmount, order.currency)}
          </span>
          <span className="text-muted-foreground">· {t("common.items", { count: order.itemCount })}</span>
          {pending && <span className="ml-auto text-xs font-medium text-primary">{timeAgo(order.createdAt)}</span>}
        </div>
        <BillTotalLink order={order} asText className="mt-1 block" />
      </div>
      <ChevronRight className="size-5 self-center text-muted-foreground/60" aria-hidden />
    </Link>
  );
}
