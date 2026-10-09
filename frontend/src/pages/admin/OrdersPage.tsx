import { ChefHat, Receipt, Zap } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KitchenOrderCard } from "@/features/admin/KitchenOrderCard";
import { OrderCard } from "@/features/admin/OrderCard";
import { useOrderActions, useOrders, useSession } from "@/features/admin/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT, type Key } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";

const FILTERS: { value: string; label: Key }[] = [
  { value: "KITCHEN", label: "a.orders.kitchen" },
  { value: "SERVED", label: "a.orders.served" },
  { value: "COMPLETED", label: "a.orders.completed" },
  { value: "CANCELLED", label: "a.orders.cancelled" },
  { value: "ALL", label: "a.orders.all" },
];

export default function OrdersPage() {
  const { t } = useT();
  const [params, setParams] = useSearchParams();
  const status = FILTERS.some((f) => f.value === params.get("status")) ? params.get("status")! : "KITCHEN";
  const orders = useOrders(status);
  useDocumentTitle(t("a.orders.title"));

  return (
    <>
      <PageHeader
        title={t("a.orders.title")}
        actions={
          <span className="mr-2 flex items-center gap-1.5 text-xs font-medium text-success">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            {t("a.orders.live")}
          </span>
        }
      />
      <div
        className="no-scrollbar sticky top-16 z-20 flex gap-2 overflow-x-auto bg-background/95 px-4 pb-3 backdrop-blur sm:px-6"
        role="tablist"
        aria-label={t("a.orders.filter")}
      >
        {FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={status === f.value}
            onClick={() => setParams(f.value === "KITCHEN" ? {} : { status: f.value }, { replace: true })}
            className={cn(
              "press h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
              status === f.value ? "bg-foreground text-background" : "bg-card text-foreground/75 ring-1 ring-border",
            )}
          >
            {t(f.label)}
          </button>
        ))}
      </div>

      <div className="px-4 pt-1 sm:px-6">
        {orders.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : orders.isError ? (
          <p className="py-10 text-center text-muted-foreground">{orders.error.message}</p>
        ) : status === "KITCHEN" ? (
          <KitchenBoard orders={orders.data} />
        ) : orders.data.length === 0 ? (
          <EmptyState icon={Receipt} title={t("a.orders.empty")} />
        ) : (
          <div className="space-y-3">
            {orders.data.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function KitchenBoard({ orders }: { orders: Order[] }) {
  const { t } = useT();
  const { data: session } = useSession();
  const actions = useOrderActions();
  const fresh = orders.filter((o) => o.status === "PENDING");
  const cooking = orders.filter((o) => o.status !== "PENDING");

  if (!orders.length) {
    return <EmptyState icon={ChefHat} title={t("a.orders.kitchenEmpty")} description={t("a.orders.kitchenEmptyText")} />;
  }

  return (
    <div className="space-y-6">
      {session?.restaurant.autoAcceptOrders && (
        <p className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-sm text-success">
          <Zap className="size-4 shrink-0" aria-hidden /> {t("a.orders.autoAcceptOn")}
        </p>
      )}

      {fresh.length > 0 && (
        <section aria-labelledby="sec-new">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="sec-new" className="flex items-center gap-2 text-lg font-bold">
              {t("a.orders.newSection")}
              <span className="tabular grid h-6 min-w-6 place-items-center rounded-full bg-primary px-2 text-xs text-primary-foreground">{fresh.length}</span>
            </h2>
            {fresh.length > 1 && (
              <Button
                size="sm"
                loading={actions.acceptMany.isPending}
                onClick={() =>
                  actions.acceptMany.mutate(
                    fresh.map((o) => o.id),
                    {
                      onSuccess: () => toast.success(t("a.orders.acceptedMany", { count: fresh.length })),
                      onError: (err) => toast.error(err.message),
                    },
                  )
                }
              >
                {t("a.orders.acceptAll", { count: fresh.length })}
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {fresh.map((o) => (
              <KitchenOrderCard key={o.id} order={o} />
            ))}
          </div>
        </section>
      )}

      {cooking.length > 0 && (
        <section aria-labelledby="sec-cooking">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="sec-cooking" className="text-lg font-bold">
              {t("a.orders.cookingSection")}
            </h2>
            <span className="text-xs text-muted-foreground">{t("a.orders.tickHint")}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {cooking.map((o) => (
              <KitchenOrderCard key={o.id} order={o} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
