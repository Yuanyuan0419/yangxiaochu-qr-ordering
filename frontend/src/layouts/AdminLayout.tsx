import { ClipboardList, Home, LayoutGrid, Loader2, Settings, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { RestaurantLogo } from "@/components/RestaurantLogo";
import { useSession } from "@/features/admin/queries";
import { useNewOrderAlerts } from "@/hooks/useNewOrderAlerts";
import { useLocalized, useT, type Key } from "@/i18n";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services/api";
import type { Restaurant } from "@/types";

const NAV: { to: string; label: Key; icon: LucideIcon; end?: boolean; badge?: boolean }[] = [
  { to: "/admin", label: "a.nav.home", icon: Home, end: true },
  { to: "/admin/orders", label: "a.nav.orders", icon: ClipboardList, badge: true },
  { to: "/admin/tables", label: "a.nav.tables", icon: LayoutGrid },
  { to: "/admin/menu", label: "a.nav.menu", icon: UtensilsCrossed },
  { to: "/admin/settings", label: "a.nav.settings", icon: Settings },
];

export default function AdminLayout() {
  const session = useSession();
  const location = useLocation();

  if (session.isPending) {
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy>
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (session.isError) {
    if (session.error instanceof ApiError && (session.error.status === 401 || session.error.status === 403)) {
      return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname)}`} replace />;
    }
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center text-muted-foreground">
        {session.error.message}
        <RetryButton onClick={() => session.refetch()} />
      </div>
    );
  }

  return <AdminShell restaurant={session.data.restaurant} />;
}

function RetryButton({ onClick }: { onClick: () => void }) {
  const { t } = useT();
  return (
    <button className="mt-3 font-semibold text-primary" onClick={onClick}>
      {t("common.retry")}
    </button>
  );
}

function AdminShell({ restaurant }: { restaurant: Restaurant }) {
  const pending = useNewOrderAlerts();
  const { t } = useT();
  const l = useLocalized();
  const restaurantName = l(restaurant);
  const logoUrl = restaurant.logoUrl;

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-card px-4 py-6 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <RestaurantLogo name={restaurant.name} logoUrl={logoUrl} className="size-10 rounded-xl text-base" />
          <div className="min-w-0">
            <p className="truncate font-bold">{restaurantName}</p>
            <p className="text-xs text-muted-foreground">{t("a.ownerApp")}</p>
          </div>
        </div>
        <nav className="space-y-1" aria-label={t("a.nav.main")}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 font-medium transition-colors",
                  isActive ? "bg-primary-soft text-primary" : "text-foreground/70 hover:bg-muted",
                )
              }
            >
              <item.icon className="size-5" aria-hidden />
              <span className="flex-1">{t(item.label)}</span>
              {item.badge && pending > 0 && <PendingBadge count={pending} />}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 pb-28 lg:pb-10">
        <div className="mx-auto w-full max-w-3xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label={t("a.nav.main")}
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn("relative grid h-8 w-14 place-items-center rounded-full transition-colors", isActive && "bg-primary-soft")}>
                    <item.icon className="size-[22px]" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                    {item.badge && pending > 0 && <PendingBadge count={pending} className="absolute -right-0.5 -top-1" />}
                  </span>
                  <span className="max-w-full truncate px-1">{t(item.label)}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function PendingBadge({ count, className }: { count: number; className?: string }) {
  const { t } = useT();
  return (
    <span
      className={cn("tabular grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground", className)}
      aria-label={t("a.pendingBadge", { count })}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
