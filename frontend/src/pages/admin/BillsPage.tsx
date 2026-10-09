import { Banknote, ChevronLeft, ChevronRight, CreditCard, ReceiptText, Wallet } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillHistory, useDashboard } from "@/features/admin/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import { formatDate, formatPrice, formatTime, isoDate } from "@/utils/format";

/** Daily reconciliation: paid bills with totals per payment method. */
export default function BillsPage() {
  const { t } = useT();
  const [params, setParams] = useSearchParams();
  const today = isoDate(new Date());
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") ?? "") ? params.get("date")! : today;
  const history = useBillHistory(date);
  const dashboard = useDashboard();
  useDocumentTitle(t("a.bills.title"));

  const shift = (days: number) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + days);
    const next = isoDate(d);
    setParams(next === today ? {} : { date: next }, { replace: true });
  };

  const h = history.data;
  const openTables = dashboard.data?.openTables ?? 0;

  return (
    <>
      <PageHeader title={t("a.bills.title")} subtitle={t("a.bills.subtitle")} back="/admin/settings" />
      <div className="space-y-4 px-4 sm:px-6">
        <div className="flex items-center gap-2 rounded-2xl bg-card p-1.5 shadow-soft ring-1 ring-border/60">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label={t("a.bills.prevDay")}>
            <ChevronLeft />
          </Button>
          <label className="relative flex-1 text-center">
            <span className="sr-only">{t("a.bills.date")}</span>
            <span className="pointer-events-none block font-semibold">{formatDate(new Date(`${date}T12:00:00`))}</span>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => e.target.value && setParams(e.target.value === today ? {} : { date: e.target.value }, { replace: true })}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} disabled={date >= today} aria-label={t("a.bills.nextDay")}>
            <ChevronRight />
          </Button>
        </div>

        {date === today && openTables > 0 && (
          <Link to="/admin/tables" className="block rounded-xl bg-warning-soft px-4 py-2.5 text-sm font-medium text-warning">
            {t("a.bills.openNow", { count: openTables })} →
          </Link>
        )}

        {history.isPending ? (
          <Skeleton className="h-40 rounded-3xl" />
        ) : history.isError ? (
          <p className="py-10 text-center text-muted-foreground">{history.error.message}</p>
        ) : (
          h && (
            <>
              <section className="rounded-3xl bg-foreground p-5 text-background">
                <p className="text-sm opacity-70">{t("a.bills.total")}</p>
                <p className="tabular text-4xl font-bold tracking-tight">{formatPrice(h.total)}</p>
                <p className="mt-1 text-sm opacity-70">{t("a.bills.count", { count: h.count })}</p>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  {(
                    [
                      ["CASH", Banknote],
                      ["CARD", CreditCard],
                      ["OTHER", Wallet],
                    ] as const
                  ).map(([m, Icon]) => (
                    <div key={m} className="rounded-2xl bg-background/10 p-3">
                      <dt className="flex items-center gap-1.5 opacity-75">
                        <Icon className="size-4" aria-hidden /> {t(`pay.${m}`)}
                      </dt>
                      <dd className="tabular mt-1 font-bold">{formatPrice(h.byMethod[m])}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {h.cleared.count > 0 && (
                <p className="rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  {t("a.bills.cleared", { count: h.cleared.count, total: formatPrice(h.cleared.total) })}
                </p>
              )}

              {h.sessions.length === 0 ? (
                <EmptyState icon={ReceiptText} title={t("a.bills.empty")} />
              ) : (
                <ul className="space-y-2">
                  {h.sessions.map((s) => (
                    <li key={s.id}>
                      <Link to={`/admin/bills/${s.id}`} className="press flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border/60">
                        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary">
                          <span className="tabular text-lg font-bold">{s.tableNumber}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="tabular font-semibold">
                            {formatTime(s.openedAt)} – {s.closedAt ? formatTime(s.closedAt) : "…"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("common.orders", { count: s.orderCount })} ·{" "}
                            {s.closeType === "CLEARED" ? (
                              <span className="font-semibold text-warning">{t("a.clear.cleared")}</span>
                            ) : s.paymentMethod ? (
                              t(`pay.${s.paymentMethod}`)
                            ) : (
                              "—"
                            )}
                          </p>
                        </div>
                        <span className={`tabular text-lg font-bold ${s.closeType === "CLEARED" ? "text-muted-foreground line-through" : ""}`}>
                          {formatPrice(s.totalAmount)}
                        </span>
                        <ChevronRight className="size-5 text-muted-foreground/60" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )
        )}
      </div>
    </>
  );
}
