import { Check, CheckCheck, ChevronRight, MessageSquareText } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useLocalized, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";
import { duration, formatTime } from "@/utils/format";
import { Badge } from "@/components/ui/badge";
import { AddOnBadge, BillTotalLink } from "./BillContext";
import { useOrderActions } from "./queries";

/**
 * Kitchen ticket: every dish is a big tap target that toggles "served".
 * New orders get one "Accept" button; cooking orders get "All served".
 */
export function KitchenOrderCard({ order }: { order: Order }) {
  const { t, lang } = useT();
  const l = useLocalized();
  const actions = useOrderActions();
  const pending = order.status === "PENDING";
  const busy = actions.tickItem.isPending || actions.serveAll.isPending || actions.setStatus.isPending;

  const fail = (err: unknown) => toast.error(err instanceof Error ? err.message : t("a.orders.updateFailed"));

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-border/60",
        pending && "ring-2 ring-primary/50",
      )}
    >
      <Link to={`/admin/orders/${order.id}`} className="flex items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-muted/50">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-foreground text-background">
          <span className="tabular text-xl font-bold leading-none">{order.tableNumber}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="tabular font-bold">#{order.orderNumber}</span>
            <StatusBadge status={order.status} />
            <AddOnBadge order={order} />
            {order.bill?.newGuestsHint && <Badge variant="warning">{t("a.newGuests.short")}</Badge>}
          </div>
          <p className="tabular mt-0.5 text-sm text-muted-foreground">
            {formatTime(order.createdAt)} · {t("a.orders.waitingFor", { time: duration(order.createdAt) })}
          </p>
          <BillTotalLink order={order} asText />
        </div>
        <ChevronRight className="size-5 text-muted-foreground/60" aria-hidden />
      </Link>


      {order.note && (
        <p className="flex gap-2 bg-warning-soft px-4 py-2.5 text-sm font-medium text-warning">
          <MessageSquareText className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="text-foreground">{order.note}</span>
        </p>
      )}

      <ul className="divide-y">
        {order.items.map((item) => {
          const served = !!item.servedAt;
          const name = l(item);
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={busy}
                aria-pressed={served}
                aria-label={t(served ? "a.orders.markUnserved" : "a.orders.markServed", { name })}
                onClick={() =>
                  actions.tickItem.mutate({ orderId: order.id, itemId: item.id!, served: !served }, { onError: fail })
                }
                className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors active:bg-muted disabled:opacity-70"
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-lg transition-colors",
                    served ? "bg-success text-white" : "ring-2 ring-inset ring-input",
                  )}
                  aria-hidden
                >
                  {served && <Check className="size-4" strokeWidth={3} />}
                </span>
                <span className={cn("tabular w-9 shrink-0 text-lg font-bold", served && "text-muted-foreground")}>×{item.quantity}</span>
                <span className={cn("min-w-0 flex-1", served && "text-muted-foreground line-through decoration-2")}>
                  <span className="block text-[17px] font-semibold leading-snug">{name}</span>
                  {lang !== "zh" && name !== item.name && (
                    <span className="block text-xs text-muted-foreground" lang="zh">
                      {item.name}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t p-3">
        {pending ? (
          <Button
            size="lg"
            className="w-full"
            loading={actions.setStatus.isPending}
            onClick={() =>
              actions.setStatus.mutate(
                { id: order.id, status: "PREPARING" },
                { onSuccess: () => toast.success(t("a.orders.accepted")), onError: fail },
              )
            }
          >
            {t("a.orders.accept")}
          </Button>
        ) : (
          <Button
            size="lg"
            variant="soft"
            className="w-full"
            loading={actions.serveAll.isPending}
            onClick={() => actions.serveAll.mutate(order.id, { onSuccess: () => toast.success(t("a.orders.allServed")), onError: fail })}
          >
            <CheckCheck /> {t("a.orders.serveAll")}
          </Button>
        )}
      </div>
    </article>
  );
}
