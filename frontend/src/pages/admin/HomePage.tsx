import { BellRing, ChefHat, ChevronRight, Euro, LayoutGrid, Plus, Receipt, ReceiptText, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { RestaurantLogo } from "@/components/RestaurantLogo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderCard } from "@/features/admin/OrderCard";
import { CheckoutButton } from "@/features/admin/CheckoutButton";
import { useDashboard, useSession, useTables } from "@/features/admin/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLocalized, useT } from "@/i18n";
import { duration, formatPrice, greetingKey } from "@/utils/format";

export default function HomePage() {
  const { t } = useT();
  const l = useLocalized();
  const { data: session } = useSession();
  const dashboard = useDashboard();
  const tables = useTables();
  const seated = (tables.data ?? []).filter((x) => x.bill);
  useDocumentTitle(session ? `${l(session.restaurant)} · ${t("a.ownerApp")}` : t("a.ownerApp"));
  if (!session) return null;

  const d = dashboard.data;
  return (
    <div className="px-4 pt-6 sm:px-6">
      <header className="flex items-center gap-3">
        <RestaurantLogo name={session.restaurant.name} logoUrl={session.restaurant.logoUrl} className="size-14" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted-foreground">{l(session.restaurant)}</p>
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {t("a.home.greet", { greeting: t(greetingKey()), name: session.user.displayName })}
          </h1>
        </div>
      </header>

      {!session.restaurant.logoUrl && (
        <Link to="/admin/settings/restaurant" className="press mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary-soft/50 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t("a.home.uploadLogo")}</p>
            <p className="text-sm text-muted-foreground">{t("a.home.uploadLogoText")}</p>
          </div>
          <ChevronRight className="size-5 text-primary" aria-hidden />
        </Link>
      )}

      {d && d.pendingOrders > 0 && (
        <Link to="/admin/orders" className="press mt-5 flex items-center gap-4 rounded-2xl bg-primary p-4 text-primary-foreground shadow-lift">
          <span className="grid size-12 place-items-center rounded-full bg-white/20">
            <BellRing className="size-6" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="text-lg font-bold">{t("a.home.pendingTitle", { count: d.pendingOrders })}</p>
            <p className="text-sm opacity-85">{t("a.home.pendingText")}</p>
          </div>
          <ChevronRight className="size-6" aria-hidden />
        </Link>
      )}

      {seated.length > 0 && (
        <section className="mt-5" aria-labelledby="seated-h">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="seated-h" className="text-lg font-bold">
              {t("a.home.seated")}
            </h2>
            <Link to="/admin/tables" className="text-sm font-semibold text-primary">
              {t("a.nav.tables")}
            </Link>
          </div>
          <ul className="space-y-2">
            {seated.map((x) => (
              <li key={x.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft ring-1 ring-border/60">
                <Link to={`/admin/tables/${x.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="tabular grid size-12 shrink-0 place-items-center rounded-xl bg-foreground text-xl font-bold text-background">{x.tableNumber}</span>
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">
                      {duration(x.bill!.openedAt)} · {t("common.orders", { count: x.bill!.orderCount })}
                    </span>
                    <span className="block text-xs font-semibold">
                      {x.bill!.waitingItems === 0 && x.bill!.pendingCount === 0 ? (
                        <span className="text-success">{t("a.bill.allServed")}</span>
                      ) : (
                        <span className="text-warning">{t("a.tables.toServe", { count: x.bill!.waitingItems })}</span>
                      )}
                    </span>
                  </span>
                </Link>
                <CheckoutButton table={x} className="h-11 w-auto shrink-0 px-4" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label={t("a.home.overview")} className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Euro} label={t("a.stat.revenue")} value={d ? formatPrice(d.todayRevenue) : undefined} loading={dashboard.isPending} />
        <Stat icon={Receipt} label={t("a.stat.orders")} value={d?.todayOrders} loading={dashboard.isPending} />
        <Stat icon={ChefHat} label={t("a.stat.kitchen")} value={d?.kitchenOrders} loading={dashboard.isPending} to="/admin/orders" />
        <Stat icon={Users} label={t("a.stat.openTables")} value={d?.openTables} loading={dashboard.isPending} to="/admin/tables" />
      </section>

      {d && (
        <Link to="/admin/bills" className="press mt-3 flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-soft ring-1 ring-border/60">
          <ReceiptText className="size-5 text-muted-foreground" aria-hidden />
          <span className="tabular flex-1 text-sm">{t("a.home.paidToday", { count: d.paidBillsToday, total: formatPrice(d.paidToday) })}</span>
          <span className="text-sm font-semibold text-primary">{t("a.home.reconcile")}</span>
          <ChevronRight className="size-4 text-primary" aria-hidden />
        </Link>
      )}

      <section className="mt-3 grid grid-cols-2 gap-3">
        <Button variant="outline" size="lg" className="h-14 justify-start rounded-2xl" asChild>
          <Link to="/admin/products/new">
            <Plus className="text-primary" /> {t("a.home.addDish")}
          </Link>
        </Button>
        <Button variant="outline" size="lg" className="h-14 justify-start rounded-2xl" asChild>
          <Link to="/admin/tables">
            <LayoutGrid className="text-primary" /> {t("a.home.tablesQr")}
          </Link>
        </Button>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t("a.home.recent")}</h2>
          <Link to="/admin/orders?status=ALL" className="text-sm font-semibold text-primary">
            {t("a.home.allOrders")}
          </Link>
        </div>
        {dashboard.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : d?.recentOrders.length ? (
          <div className="space-y-3">
            {d.recentOrders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Receipt} title={t("a.home.noOrders")} description={t("a.home.noOrdersText")} className="rounded-2xl bg-card" />
        )}
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  loading,
  to,
}: {
  icon: typeof Receipt;
  label: string;
  value: React.ReactNode;
  loading: boolean;
  to?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      {loading ? <Skeleton className="mt-2 h-8 w-16" /> : <p className="tabular mt-1.5 text-2xl font-bold">{value}</p>}
    </>
  );
  const cls = "block rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border/60";
  return to ? (
    <Link to={to} className={`press ${cls}`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
