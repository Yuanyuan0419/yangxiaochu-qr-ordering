import { Check, CheckCheck, ReceiptText } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddOnBadge, NewGuestsBanner } from "@/features/admin/BillContext";
import { useOrder, useOrderActions } from "@/features/admin/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLocalized, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { CANCELLABLE, formatDateTime, formatPrice, formatTime, KITCHEN, statusKey } from "@/utils/format";

export default function OrderDetailPage() {
  const id = Number(useParams().id);
  const order = useOrder(id);
  const actions = useOrderActions();
  const { t, lang } = useT();
  const l = useLocalized();
  useDocumentTitle(order.data ? t("a.order.title", { n: order.data.orderNumber }) : "…");

  const fail = (err: unknown) => {
    toast.error(err instanceof Error ? err.message : t("a.orders.updateFailed"));
    order.refetch();
  };

  if (order.isPending || order.isError) {
    return (
      <>
        <PageHeader title="…" back="/admin/orders" />
        {order.isError ? (
          <p className="py-16 text-center text-muted-foreground">{order.error.message}</p>
        ) : (
          <div className="space-y-3 px-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        )}
      </>
    );
  }

  const o = order.data;
  const canTick = KITCHEN.includes(o.status) || o.status === "SERVED";
  const canCancel = CANCELLABLE.includes(o.status);
  const busy = actions.tickItem.isPending || actions.serveAll.isPending || actions.setStatus.isPending;

  return (
    <div className="pb-32">
      <PageHeader
        title={t("a.order.title", { n: o.orderNumber })}
        subtitle={formatDateTime(o.createdAt)}
        back="/admin/orders"
        actions={<StatusBadge status={o.status} className="mr-2 text-sm" />}
      />

      <div className="space-y-4 px-4 sm:px-6">
        <NewGuestsBanner order={o} />
        <AddOnBadge order={o} className="text-sm" />
        <section className="grid grid-cols-3 divide-x rounded-2xl bg-card py-4 text-center shadow-soft ring-1 ring-border/60">
          <div>
            <p className="text-xs text-muted-foreground">{t("common.table")}</p>
            <p className="tabular text-2xl font-bold">{o.tableNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("a.order.count")}</p>
            <p className="tabular text-2xl font-bold">{o.itemCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("a.order.amount")}</p>
            <p className={cn("tabular text-2xl font-bold", o.status === "CANCELLED" && "text-muted-foreground line-through")}>
              {formatPrice(o.totalAmount, o.currency)}
            </p>
          </div>
        </section>

        {o.note && (
          <section className="rounded-2xl bg-warning-soft p-4 text-warning">
            <p className="text-sm font-semibold">{t("a.order.note")}</p>
            <p className="mt-1 text-[15px] text-foreground">{o.note}</p>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-border/60">
          <div className="flex items-baseline justify-between px-4 pb-1 pt-4">
            <h2 className="font-semibold">{t("a.order.dishes")}</h2>
            {canTick && <span className="text-xs text-muted-foreground">{t("a.orders.tickHint")}</span>}
          </div>
          <ul className="divide-y">
            {o.items.map((item) => {
              const served = !!item.servedAt;
              const name = l(item);
              const content = (
                <>
                  <span
                    className={cn("grid size-7 shrink-0 place-items-center rounded-lg", served ? "bg-success text-white" : "ring-2 ring-inset ring-input")}
                    aria-hidden
                  >
                    {served && <Check className="size-4" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block font-medium", served && "text-muted-foreground")}>{name}</span>
                    {lang !== "zh" && name !== item.name && (
                      <span className="block text-xs text-muted-foreground" lang="zh">
                        {item.name}
                      </span>
                    )}
                    <span className="tabular block text-sm text-muted-foreground">
                      {item.quantity} × {formatPrice(item.unitPrice, o.currency)}
                      {item.servedAt && ` · ${t("c.served")} ${formatTime(item.servedAt)}`}
                    </span>
                  </span>
                  <span className="tabular font-semibold">{formatPrice(item.totalPrice, o.currency)}</span>
                </>
              );
              return (
                <li key={item.id}>
                  {canTick ? (
                    <button
                      type="button"
                      disabled={busy}
                      aria-pressed={served}
                      aria-label={t(served ? "a.orders.markUnserved" : "a.orders.markServed", { name })}
                      onClick={() => actions.tickItem.mutate({ orderId: o.id, itemId: item.id!, served: !served }, { onError: fail })}
                      className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-muted disabled:opacity-70"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mx-4 flex items-baseline justify-between border-t py-3">
            <span className="font-semibold">{t("common.total")}</span>
            <span className="tabular text-xl font-bold">{formatPrice(o.totalAmount, o.currency)}</span>
          </div>
        </section>

        <Button variant="outline" size="lg" className="w-full" asChild>
          <Link to={`/admin/bills/${o.sessionId}`}>
            <ReceiptText /> {t("a.order.viewBill")}
            {o.bill && o.bill.count > 1 && <span className="tabular font-normal text-muted-foreground">· {formatPrice(o.bill.total)}</span>}
          </Link>
        </Button>

        {o.statusHistory && o.statusHistory.length > 0 && (
          <section className="rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border/60">
            <h2 className="mb-3 font-semibold">{t("a.order.history")}</h2>
            <ol className="space-y-3">
              {o.statusHistory.map((h, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className={cn("size-2.5 rounded-full", i === o.statusHistory!.length - 1 ? "bg-primary" : "bg-border")} aria-hidden />
                  <span className="flex-1">{t(statusKey(h.to))}</span>
                  <span className="tabular text-muted-foreground">{formatTime(h.at)}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      {(o.status === "PENDING" || o.status === "PREPARING" || o.status === "SERVING") && (
        <div className="no-print fixed inset-x-0 bottom-16 z-30 border-t bg-card/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
          <div className="mx-auto flex max-w-3xl gap-3">
            {canCancel && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="lg" className="text-destructive" disabled={busy}>
                    {t("a.order.cancel")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("a.order.cancelTitle", { n: o.orderNumber })}</AlertDialogTitle>
                    <AlertDialogDescription>{t("a.order.cancelText")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("a.order.keep")}</AlertDialogCancel>
                    <AlertDialogAction
                      destructive
                      onClick={() =>
                        actions.setStatus.mutate(
                          { id: o.id, status: "CANCELLED" },
                          { onSuccess: () => toast.success(t("a.orders.updated", { status: t("status.CANCELLED") })), onError: fail },
                        )
                      }
                    >
                      {t("a.order.confirmCancel")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {o.status === "PENDING" ? (
              <Button
                size="lg"
                className="flex-1"
                loading={actions.setStatus.isPending}
                loadingText={t("a.order.updating")}
                onClick={() =>
                  actions.setStatus.mutate({ id: o.id, status: "PREPARING" }, { onSuccess: () => toast.success(t("a.orders.accepted")), onError: fail })
                }
              >
                {t("a.orders.accept")}
              </Button>
            ) : (
              <Button
                size="lg"
                className="flex-1"
                loading={actions.serveAll.isPending}
                loadingText={t("a.order.updating")}
                onClick={() => actions.serveAll.mutate(o.id, { onSuccess: () => toast.success(t("a.orders.allServed")), onError: fail })}
              >
                <CheckCheck /> {t("a.orders.serveAll")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
