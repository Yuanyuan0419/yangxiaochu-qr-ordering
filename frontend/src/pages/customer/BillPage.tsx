import { ArrowLeft, Check, Plus, ReceiptText } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuError } from "@/features/customer/MenuStatus";
import { useTableBill } from "@/features/customer/queries";
import { useTableParams } from "@/features/customer/useTableParams";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLocalized, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { formatPrice, formatTime } from "@/utils/format";

/**
 * The guest's single view of the table: every dish ordered this visit in one list, oldest first,
 * each ticked when served. Dishes added later simply appear underneath.
 */
export default function BillPage() {
  const { slug, token, base } = useTableParams();
  const bill = useTableBill(slug, token, 5000);
  const { t } = useT();
  const l = useLocalized();
  useDocumentTitle(t("c.myOrder"));

  const header = (
    <header className="sticky top-0 z-20 flex items-center gap-2 bg-background/95 px-2 py-2 backdrop-blur">
      <Button variant="ghost" size="icon" asChild>
        <Link to={base} aria-label={t("c.backToMenu")}>
          <ArrowLeft />
        </Link>
      </Button>
      <h1 className="flex-1 text-lg font-bold">{t("c.myOrder")}</h1>
      <LanguageSwitcher className="mr-2" />
    </header>
  );

  if (bill.isPending) {
    return (
      <div className="mx-auto max-w-lg">
        {header}
        <div className="space-y-3 px-4">
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }
  if (bill.isError) return <MenuError error={bill.error} onRetry={() => bill.refetch()} />;

  const s = bill.data.session;
  if (!s) {
    return (
      <div className="mx-auto min-h-dvh max-w-lg">
        {header}
        <EmptyState
          icon={ReceiptText}
          title={t("c.bill.empty")}
          description={t("c.bill.emptyText")}
          action={
            <Button asChild>
              <Link to={base}>{t("c.bill.startOrdering")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const orders = [...s.orders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const active = orders.filter((o) => o.status !== "CANCELLED").flatMap((o) => o.items);
  const total = active.length;
  const served = active.filter((i) => i.servedAt).length;
  const allServed = total > 0 && served === total;

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-32">
      {header}
      <div className="px-4">
        <section className="overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-border/60">
          <div className={cn("flex items-center justify-between px-4 py-3", allServed ? "bg-success-soft text-success" : "bg-secondary")}>
            <span className="text-sm font-semibold">{t("common.tableN", { n: s.tableNumber })}</span>
            <span className="text-sm font-semibold" aria-live="polite">
              {allServed ? t("c.allServed") : t("c.servedProgress", { served, total })}
            </span>
          </div>

          <ul>
            {orders.map((o, oi) => {
              const cancelled = o.status === "CANCELLED";
              return (
                <li key={o.publicId}>
                  {oi > 0 && (
                    <p className="flex items-center gap-2 px-4 pt-3 text-xs text-muted-foreground">
                      <span className="h-px flex-1 bg-border" aria-hidden />
                      {t("c.addedAt", { time: formatTime(o.createdAt) })}
                      <span className="h-px flex-1 bg-border" aria-hidden />
                    </p>
                  )}
                  <ul className="divide-y px-4">
                    {o.items.map((item, ii) => {
                      const isServed = !!item.servedAt && !cancelled;
                      return (
                        <li key={ii} className={cn("flex items-center gap-3 py-3", cancelled && "opacity-50")}>
                          <span
                            role="img"
                            aria-label={cancelled ? t("status.CANCELLED") : isServed ? t("c.served") : t("c.notServed")}
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-full",
                              isServed ? "bg-success text-white" : "ring-2 ring-inset ring-border",
                            )}
                          >
                            {isServed && <Check className="size-4" strokeWidth={3} />}
                          </span>
                          <span className={cn("min-w-0 flex-1", cancelled && "line-through")}>
                            <span className="text-[15px] font-medium">{l(item)}</span>
                            <span className="tabular ml-1.5 text-muted-foreground">× {item.quantity}</span>
                          </span>
                          <span
                            className={cn(
                              "shrink-0 text-xs font-semibold",
                              cancelled ? "text-muted-foreground" : isServed ? "text-success" : "text-warning",
                            )}
                          >
                            {cancelled ? t("status.CANCELLED") : isServed ? t("c.served") : t("c.notServed")}
                          </span>
                          <span className={cn("tabular w-16 shrink-0 text-right text-sm", cancelled && "line-through")}>
                            {formatPrice(item.totalPrice)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {o.note && !cancelled && <p className="mx-4 mb-2 rounded-lg bg-secondary px-3 py-2 text-xs">{t("c.noteLabel")}: {o.note}</p>}
                </li>
              );
            })}
          </ul>

          <div className="flex items-baseline justify-between border-t px-4 py-4">
            <span className="font-semibold">{t("common.total")}</span>
            <span className="tabular text-2xl font-bold">{formatPrice(s.totalAmount)}</span>
          </div>
        </section>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t("c.bill.payHint")} · {t("c.autoRefresh")}
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg bg-gradient-to-t from-background via-background to-transparent px-4 pt-6 pb-safe">
        <Button size="xl" className="w-full" asChild>
          <Link to={base}>
            <Plus /> {t("c.orderMore")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
