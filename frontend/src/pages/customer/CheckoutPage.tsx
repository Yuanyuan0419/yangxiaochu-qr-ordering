import { AlertTriangle, ArrowLeft, ShoppingBag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { ProductImage } from "@/components/ProductImage";
import { RestaurantLogo } from "@/components/RestaurantLogo";
import { Button } from "@/components/ui/button";
import { MenuError, MenuSkeleton } from "@/features/customer/MenuStatus";
import { billKey, menuKey, useMenu, usePlaceOrder } from "@/features/customer/queries";
import { useTableParams } from "@/features/customer/useTableParams";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLocalized, useT } from "@/i18n";
import { ApiError } from "@/services/api";
import { useCartStore, useTableCart } from "@/store/cart";
import { formatPrice, fromCents, toCents } from "@/utils/format";

export default function CheckoutPage() {
  const { slug, token, cartKey, base } = useTableParams();
  const menu = useMenu(slug, token);
  const cart = useTableCart(cartKey);
  const clear = useCartStore((s) => s.clear);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const rememberOrder = useCartStore((s) => s.rememberOrder);
  const placeOrder = usePlaceOrder();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useT();
  const l = useLocalized();
  useDocumentTitle(t("c.confirmTitle"));

  if (menu.isPending) return <MenuSkeleton />;
  if (menu.isError) return <MenuError error={menu.error} onRetry={() => menu.refetch()} />;

  const { restaurant, table } = menu.data;
  const available = new Map(menu.data.categories.flatMap((c) => c.products).map((p) => [p.id, p.isAvailable]));
  const soldOut = cart.lines.filter((l) => available.get(l.productId) === false);

  async function submit() {
    try {
      const order = await placeOrder.mutateAsync({
        restaurantSlug: slug,
        qrToken: token,
        items: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        note: cart.note.trim() || null,
      });
      rememberOrder(cartKey, order.publicId);
      clear(cartKey);
      queryClient.invalidateQueries({ queryKey: billKey(slug, token) });
      navigator.vibrate?.([20, 40, 20]);
      toast.success(t("c.orderPlaced"));
      navigate(`${base}/bill`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Availability changed since the menu was loaded.
        queryClient.invalidateQueries({ queryKey: menuKey(slug, token) });
      }
      toast.error(err instanceof Error ? err.message : t("c.orderFailed"));
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-36">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-background/95 px-2 py-2 backdrop-blur">
        <Button variant="ghost" size="icon" asChild>
          <Link to={base} aria-label={t("c.backToMenu")}>
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-lg font-bold">{t("c.confirmTitle")}</h1>
      </header>

      {cart.count === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={t("c.cartEmpty")}
          description={t("c.cartEmptyText")}
          action={
            <Button asChild>
              <Link to={base}>{t("c.backToMenu")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4 px-4 pt-2">
          <section className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border/60">
            <RestaurantLogo name={restaurant.name} logoUrl={restaurant.logoUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{l(restaurant)}</p>
              <p className="text-sm text-muted-foreground">{t("c.dineIn")}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t("common.table")}</p>
              <p className="tabular text-2xl font-bold leading-none">{table.tableNumber}</p>
            </div>
          </section>

          {soldOut.length > 0 && (
            <div role="alert" className="flex gap-3 rounded-2xl bg-warning-soft p-4 text-sm text-warning">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">{t("c.soldOutAlertTitle")}</p>
                <p className="mt-0.5">{t("c.soldOutAlertText")}</p>
              </div>
            </div>
          )}

          <section className="rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border/60">
            <h2 className="mb-1 font-semibold">{t("c.selected")}</h2>
            <ul className="divide-y">
              {cart.lines.map((line) => {
                const isSoldOut = available.get(line.productId) === false;
                return (
                  <li key={line.productId} className="flex items-center gap-3 py-3">
                    <ProductImage src={line.imageUrl} alt={l(line)} className="size-12 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{l(line)}</p>
                      <p className="tabular text-sm text-muted-foreground">
                        {line.quantity} × {formatPrice(line.price)}
                      </p>
                    </div>
                    {isSoldOut ? (
                      <Button variant="outline" size="sm" onClick={() => setQuantity(cartKey, line.productId, 0)}>
                        {t("c.removeSoldOut")}
                      </Button>
                    ) : (
                      <span className="tabular font-semibold">{formatPrice(fromCents(toCents(line.price) * line.quantity))}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            {cart.note.trim() && (
              <div className="mt-2 rounded-xl bg-secondary p-3 text-sm">
                <span className="font-semibold">{t("c.noteLabel")}: </span>
                {cart.note}
              </div>
            )}
            <div className="mt-3 flex items-baseline justify-between border-t pt-3">
              <span className="font-semibold">{t("common.total")}</span>
              <span className="tabular text-2xl font-bold">{formatPrice(cart.total)}</span>
            </div>
          </section>

          <p className="px-2 text-center text-xs text-muted-foreground">{t("c.confirmHint")}</p>
        </div>
      )}

      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t bg-card px-4 pt-3 pb-safe">
          <Button
            size="xl"
            className="w-full"
            onClick={submit}
            loading={placeOrder.isPending}
            loadingText={t("c.placing")}
            disabled={soldOut.length > 0}
          >
            {t("c.placeOrder")} · <span className="tabular">{formatPrice(cart.total)}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
