import { useState } from "react";
import { HelpCircle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalized, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Order, PaymentMethod } from "@/types";
import { duration, formatPrice, formatTime, fromCents, toCents } from "@/utils/format";
import { METHODS } from "./paymentMethods";
import { useBill, useOrderActions, useSplitBill } from "./queries";

/** "Add-on · order 2" badge for any order after the first on a bill. */
export function AddOnBadge({ order, className }: { order: Order; className?: string }) {
  const { t } = useT();
  if (!order.bill || order.bill.index < 2) return null;
  return (
    <Badge variant="info" className={className}>
      {t("a.addOn", { n: order.bill.index })}
    </Badge>
  );
}

/** "Table total €52.80 · 2 orders"; plain text when already inside a link. */
export function BillTotalLink({ order, className, asText }: { order: Order; className?: string; asText?: boolean }) {
  const { t } = useT();
  if (!order.bill || order.bill.count < 2) return null;
  const label = t("a.billTotal", { total: formatPrice(order.bill.total), count: order.bill.count });
  if (asText) return <span className={cn("tabular text-xs font-semibold text-info", className)}>{label}</span>;
  return (
    <Link to={`/admin/bills/${order.bill.sessionId}`} className={cn("tabular text-xs font-semibold text-info hover:underline", className)}>
      {label}
    </Link>
  );
}

/**
 * Shown on an add-on that arrived long after everything earlier was served:
 * either keep it on the same bill, or close the previous guests' bill and move it to a new one.
 */
export function NewGuestsBanner({ order, compact }: { order: Order; compact?: boolean }) {
  const { t } = useT();
  const actions = useOrderActions();
  const [split, setSplit] = useState(false);
  if (!order.bill?.newGuestsHint) return null;

  return (
    <div className={cn("bg-warning-soft text-warning", compact ? "px-4 py-3" : "rounded-2xl p-4")} role="alert">
      <p className="flex items-center gap-2 font-semibold">
        <HelpCircle className="size-4 shrink-0" aria-hidden />
        {t("a.newGuests.title")}
      </p>
      <p className="mt-1 text-sm text-foreground/80">
        {t("a.newGuests.text", { time: order.bill.previousServedAt ? duration(order.bill.previousServedAt, undefined, new Date(order.createdAt).getTime()) : "" })}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-auto min-h-9 whitespace-normal py-1.5"
          loading={actions.confirmSameGuests.isPending}
          onClick={() =>
            actions.confirmSameGuests.mutate(order.id, {
              onSuccess: () => toast.success(t("a.newGuests.confirmed")),
              onError: (err) => toast.error(err.message),
            })
          }
        >
          {t("a.newGuests.same")}
        </Button>
        <Button size="sm" className="h-auto min-h-9 whitespace-normal py-1.5" onClick={() => setSplit(true)}>
          <Users /> {t("a.newGuests.new")}
        </Button>
      </div>
      {split && <SplitCheckoutDialog order={order} onClose={() => setSplit(false)} />}
    </div>
  );
}

/** Check out the previous guests; this order (and anything ordered after it) moves to a new bill. */
function SplitCheckoutDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const { t } = useT();
  const l = useLocalized();
  const bill = useBill(order.bill!.sessionId);
  const split = useSplitBill();
  const [method, setMethod] = useState<PaymentMethod>("CASH");

  const orders = bill.data?.orders ?? [];
  const cutoff = new Date(order.createdAt).getTime();
  const moving = orders.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
  const previous = orders.filter((o) => new Date(o.createdAt).getTime() < cutoff);
  const previousTotal = fromCents(previous.filter((o) => o.status !== "CANCELLED").reduce((sum, o) => sum + toCents(o.totalAmount), 0));
  const table = bill.data ? t("common.tableN", { n: bill.data.tableNumber }) : "";

  const summary = (list: Order[]) =>
    list.map((o) => (
      <li key={o.id} className={cn("flex justify-between gap-3 py-1.5 text-sm", o.status === "CANCELLED" && "text-muted-foreground line-through")}>
        <span className="min-w-0">
          <span className="tabular font-semibold">#{o.orderNumber}</span> <span className="tabular text-muted-foreground">{formatTime(o.createdAt)}</span>
          <span className="block truncate text-muted-foreground">{o.items.map((i) => `${l(i)} ×${i.quantity}`).join(", ")}</span>
        </span>
        <span className="tabular shrink-0 font-semibold">{formatPrice(o.totalAmount)}</span>
      </li>
    ));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("a.split.title")} · {table}
          </DialogTitle>
          <DialogDescription>{t("a.split.text")}</DialogDescription>
        </DialogHeader>
        {bill.isPending ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            <section className="rounded-2xl bg-secondary p-3">
              <h3 className="text-xs font-semibold text-muted-foreground">{t("a.split.previous")}</h3>
              <ul className="divide-y divide-border/60">{summary(previous)}</ul>
              <p className="tabular mt-1 flex justify-between border-t pt-2 font-bold">
                <span>{t("common.total")}</span>
                <span className="text-lg">{formatPrice(previousTotal)}</span>
              </p>
            </section>
            <section className="rounded-2xl p-3 ring-1 ring-info/40">
              <h3 className="text-xs font-semibold text-info">{t("a.split.moving")}</h3>
              <ul className="divide-y divide-border/60">{summary(moving)}</ul>
            </section>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{t("a.bill.paymentMethod")}</legend>
              <div className="grid grid-cols-3 gap-2" role="radiogroup">
                {METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={method === m.value}
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      "press flex h-16 flex-col items-center justify-center gap-1 rounded-2xl text-sm font-semibold ring-1 transition-colors",
                      method === m.value ? "bg-primary-soft text-primary ring-2 ring-primary" : "bg-card ring-border",
                    )}
                  >
                    <m.icon className="size-5" aria-hidden />
                    {t(`pay.${m.value}`)}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}
        <DialogFooter>
          <Button
            size="xl"
            className="w-full"
            disabled={!bill.data || !previous.length}
            loading={split.isPending}
            loadingText={t("a.bill.checkingOut")}
            onClick={() =>
              split.mutate(
                { id: order.bill!.sessionId, paymentMethod: method, moveOrderIds: moving.map((o) => o.id) },
                {
                  onSuccess: (r) => {
                    toast.success(t("a.split.done", { total: formatPrice(r.closed.totalAmount) }));
                    onClose();
                  },
                  onError: (err) => toast.error(err.message),
                },
              )
            }
          >
            {t("a.split.confirm", { total: formatPrice(previousTotal) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
