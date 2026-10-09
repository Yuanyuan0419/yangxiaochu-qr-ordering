import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocalized, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Bill, PaymentMethod } from "@/types";
import { duration, formatDateTime, formatPrice, formatTime } from "@/utils/format";
import { NewGuestsBanner } from "./BillContext";
import { ClearTableDialog } from "./ClearTableDialog";
import { OrderCard } from "./OrderCard";
import { METHODS } from "./paymentMethods";
import { useCloseBill } from "./queries";

/** One table visit: running total, merged dishes with serving progress, and every order placed. */
export function BillView({ bill }: { bill: Bill }) {
  const { t } = useT();
  const l = useLocalized();
  const open = bill.status === "OPEN";
  const cleared = bill.closeType === "CLEARED";
  const unserved = bill.summary.reduce((n, line) => n + (line.quantity - line.servedQuantity), 0);

  return (
    <div className="space-y-4">
      <section
        className={cn(
          "rounded-3xl p-5",
          open ? "bg-foreground text-background" : cleared ? "bg-muted text-muted-foreground" : "bg-success-soft text-success",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm">
            <p className="font-semibold">{t("common.tableN", { n: bill.tableNumber })}</p>
            <p className="opacity-75">
              {open
                ? t("a.bill.openedAt", { time: formatTime(bill.openedAt), duration: duration(bill.openedAt) })
                : cleared
                  ? t("a.clear.at", { time: bill.closedAt ? formatDateTime(bill.closedAt) : "" })
                  : t("a.bill.paidAt", {
                    time: bill.closedAt ? formatDateTime(bill.closedAt) : "",
                    method: bill.paymentMethod ? t(`pay.${bill.paymentMethod}`) : "",
                  })}
            </p>
          </div>
          <span
            className={cn("rounded-full px-3 py-1 text-xs font-bold", open ? "bg-background/15" : cleared ? "bg-foreground/80 text-background" : "bg-success text-white")}
          >
            {open ? t("a.tables.seated") : cleared ? t("a.clear.cleared") : t("a.bill.paid")}
          </span>
        </div>
        <p className="mt-4 text-sm opacity-75">{t("common.total")}</p>
        <p className={cn("tabular text-4xl font-bold tracking-tight", !open && "text-foreground", cleared && "line-through opacity-60")}>
          {formatPrice(bill.totalAmount)}
        </p>
        <p className="mt-1 text-sm opacity-75">
          {t("common.orders", { count: bill.orderCount })} · {t("common.items", { count: bill.itemCount })}
        </p>
        {cleared && bill.closeNote && <p className="mt-2 rounded-xl bg-background/60 px-3 py-2 text-sm text-foreground">{bill.closeNote}</p>}
      </section>

      {open && bill.pendingCount > 0 && (
        <p role="alert" className="flex gap-2 rounded-2xl bg-primary-soft p-3 text-sm font-medium text-primary">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("a.bill.pendingWarn", { count: bill.pendingCount })}
        </p>
      )}

      <section className="rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border/60">
        <h2 className="mb-1 font-semibold">{t("a.bill.summary")}</h2>
        {bill.summary.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">—</p>
        ) : (
          <table className="w-full text-[15px]">
            <thead className="sr-only">
              <tr>
                <th>{t("a.order.dishes")}</th>
                <th>{t("a.bill.qty")}</th>
                <th>{t("a.bill.subtotal")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bill.summary.map((line, i) => {
                const done = line.servedQuantity >= line.quantity;
                return (
                  <tr key={i}>
                    <td className="py-2.5 pr-2">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn("grid size-5 shrink-0 place-items-center rounded-full", done ? "bg-success text-white" : "ring-2 ring-inset ring-border")}
                          aria-hidden
                        >
                          {done && <Check className="size-3" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block">{l(line)}</span>
                          <span className="tabular block text-xs text-muted-foreground">
                            {formatPrice(line.unitPrice)}
                            {!done && open && ` · ${t("a.bill.servedOf", { served: line.servedQuantity, total: line.quantity })}`}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="tabular w-12 py-2.5 text-right text-muted-foreground">×{line.quantity}</td>
                    <td className="tabular w-24 py-2.5 text-right font-semibold">{formatPrice(line.totalPrice)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td className="pt-3 font-semibold" colSpan={2}>
                  {t("common.total")}
                </td>
                <td className="tabular pt-3 text-right text-lg font-bold">{formatPrice(bill.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        )}
        {open && unserved > 0 && bill.pendingCount === 0 && (
          <p className="mt-3 text-xs text-muted-foreground">{t("a.bill.unservedWarn", { count: unserved })}</p>
        )}
      </section>

      <section className="no-print">
        <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">{t("a.bill.orders")}</h2>
        <div className="mb-2 space-y-2">
          {bill.orders.map((o) => (
            <NewGuestsBanner key={o.id} order={o} />
          ))}
        </div>
        <div className="space-y-2">
          {bill.orders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      </section>
    </div>
  );
}



export type CheckoutBill = Pick<Bill, "id" | "tableNumber" | "totalAmount" | "orderCount" | "itemCount" | "pendingCount">;

export function CheckoutDialog({ bill, open, onOpenChange }: { bill: CheckoutBill; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useT();
  const close = useCloseBill();
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [clearing, setClearing] = useState(false);
  const table = t("common.tableN", { n: bill.tableNumber });

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("a.bill.checkoutTitle", { table })}</DialogTitle>
          <DialogDescription>
            {t("common.orders", { count: bill.orderCount })} · {t("common.items", { count: bill.itemCount })}
          </DialogDescription>
        </DialogHeader>
        <p className="tabular text-center text-4xl font-bold">{formatPrice(bill.totalAmount)}</p>
        {bill.pendingCount > 0 && (
          <p role="alert" className="rounded-xl bg-primary-soft p-3 text-sm font-medium text-primary">
            {t("a.bill.pendingWarn", { count: bill.pendingCount })}
          </p>
        )}
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
                  "press flex h-20 flex-col items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold ring-1 transition-colors",
                  method === m.value ? "bg-primary-soft text-primary ring-2 ring-primary" : "bg-card ring-border",
                )}
              >
                <m.icon className="size-6" aria-hidden />
                {t(`pay.${m.value}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <DialogFooter>
          <Button
            size="xl"
            className="w-full"
            disabled={bill.pendingCount > 0}
            loading={close.isPending}
            loadingText={t("a.bill.checkingOut")}
            onClick={() =>
              close.mutate(
                { id: bill.id, paymentMethod: method },
                {
                  onSuccess: (b) => {
                    toast.success(t("a.bill.closedToast", { table, total: formatPrice(b.totalAmount) }));
                    onOpenChange(false);
                  },
                  onError: (err) => toast.error(err.message),
                },
              )
            }
          >
            {t("a.bill.confirmCheckout", { total: formatPrice(bill.totalAmount) })}
          </Button>
        </DialogFooter>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mx-auto text-muted-foreground"
          onClick={() => {
            onOpenChange(false);
            setClearing(true);
          }}
        >
          {t("a.clear.noPay")}
        </Button>
      </DialogContent>
    </Dialog>
    <ClearTableDialog bill={bill} open={clearing} onOpenChange={setClearing} />
    </>
  );
}
