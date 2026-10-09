import { Carrot, ChevronRight, Sparkles, FolderCog, LayoutGrid, LogOut, ReceiptText, Store, UserRound, type LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { LanguageSegmented } from "@/components/LanguageSwitcher";
import { PageHeader } from "@/components/PageHeader";
import { RestaurantLogo } from "@/components/RestaurantLogo";
import { Button } from "@/components/ui/button";
import { useLogout, useSession, useTranslateStatus } from "@/features/admin/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLocalized, useT } from "@/i18n";

export default function SettingsPage() {
  const { t } = useT();
  const l = useLocalized();
  const { data: session } = useSession();
  const logout = useLogout();
  const translation = useTranslateStatus();
  const navigate = useNavigate();
  useDocumentTitle(t("a.settings.title"));
  if (!session) return null;

  return (
    <>
      <PageHeader title={t("a.settings.title")} />
      <div className="space-y-6 px-4 sm:px-6">
        <Link to="/admin/settings/restaurant" className="press flex items-center gap-4 rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border/60">
          <RestaurantLogo name={session.restaurant.name} logoUrl={session.restaurant.logoUrl} className="size-14" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{l(session.restaurant)}</p>
            <p className="truncate text-sm text-muted-foreground">
              {session.user.displayName} · {session.user.email}
            </p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
        </Link>

        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">{t("a.settings.language")}</h2>
          <LanguageSegmented />
          <div className="mt-2 flex items-center gap-2 px-1 text-sm">
            <Sparkles className="size-4 text-muted-foreground" aria-hidden />
            <span className="flex-1">{t("a.settings.translation")}</span>
            {translation.data && (
              <span className={translation.data.enabled ? "font-semibold text-success" : "text-muted-foreground"}>
                {translation.data.enabled ? t("a.settings.translationOn") : t("a.settings.translationOff")}
              </span>
            )}
          </div>
        </section>

        <Group title={t("a.settings.account")}>
          <Row to="/admin/settings/profile" icon={UserRound} label={t("a.settings.profile")} hint={t("a.settings.profileHint")} />
          <Row to="/admin/settings/restaurant" icon={Store} label={t("a.settings.restaurant")} hint={t("a.settings.restaurantHint")} />
        </Group>

        <Group title={t("a.settings.menuTables")}>
          <Row to="/admin/categories" icon={FolderCog} label={t("a.settings.categories")} />
          <Row to="/admin/ingredients" icon={Carrot} label={t("a.settings.ingredients")} />
          <Row to="/admin/tables" icon={LayoutGrid} label={t("a.settings.tables")} />
          <Row to="/admin/bills" icon={ReceiptText} label={t("a.settings.bills")} />
        </Group>

        <Button
          variant="outline"
          size="lg"
          className="w-full text-destructive"
          loading={logout.isPending}
          onClick={() => logout.mutate(undefined, { onSettled: () => navigate("/admin/login", { replace: true }) })}
        >
          <LogOut /> {t("a.settings.logout")}
        </Button>
      </div>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="divide-y overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-border/60">{children}</div>
    </section>
  );
}

function Row({ to, icon: Icon, label, hint }: { to: string; icon: LucideIcon; label: string; hint?: string }) {
  return (
    <Link to={to} className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors hover:bg-muted/60">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground/60" aria-hidden />
    </Link>
  );
}
