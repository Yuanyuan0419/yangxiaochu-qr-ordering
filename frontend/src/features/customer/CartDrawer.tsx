import { ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ProductImage } from "@/components/ProductImage";
import { QuantityStepper } from "@/components/QuantityStepper";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { useLocalized, useT } from "@/i18n";
import { useCartStore, useTableCart } from "@/store/cart";
import { formatPrice, fromCents, toCents } from "@/utils/format";
import { useTableParams } from "./useTableParams";

export function CartDrawer({ open, onOpenChange, tableNumber }: { open: boolean; onOpenChange: (o: boolean) => void; tableNumber: string }) {
  const { t } = useT();
  const l = useLocalized();
  const { cartKey, base } = useTableParams();
  const cart = useTableCart(cartKey);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const setNote = useCartStore((s) => s.setNote);
  const clear = useCartStore((s) => s.clear);
  const navigate = useNavigate();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="flex items-end justify-between px-5 pb-3 pt-4">
          <div>
            <DrawerTitle>{t("c.cart")}</DrawerTitle>
            <DrawerDescription>{t("common.tableN", { n: tableNumber })}</DrawerDescription>
          </div>
          {cart.count > 0 && (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => clear(cartKey)}>
              {t("c.clear")}
            </Button>
          )}
        </div>

        {cart.count === 0 ? (
          <EmptyState icon={ShoppingBag} title={t("c.cartEmpty")} description={t("c.cartEmptyText")} className="pb-16" />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5">
              <ul className="divide-y">
                {cart.lines.map((line) => (
                  <li key={line.productId} className="flex items-center gap-3 py-3">
                    <ProductImage src={line.imageUrl} alt={l(line)} className="size-14 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{l(line)}</p>
                      <p className="tabular text-sm text-muted-foreground">
                        {line.quantity} × {formatPrice(line.price)}
                      </p>
                      <p className="tabular text-sm font-semibold">{formatPrice(fromCents(toCents(line.price) * line.quantity))}</p>
                    </div>
                    <QuantityStepper value={line.quantity} onChange={(q) => setQuantity(cartKey, line.productId, q)} removable label={l(line)} />
                  </li>
                ))}
              </ul>
              <label className="mt-2 block pb-4">
                <span className="mb-2 block text-sm font-semibold text-muted-foreground">{t("c.note")}</span>
                <Textarea
                  value={cart.note}
                  onChange={(e) => setNote(cartKey, e.target.value.slice(0, 500))}
                  placeholder={t("c.notePlaceholder")}
                  className="min-h-[72px]"
                />
              </label>
            </div>
            <div className="border-t px-5 pt-3 pb-safe">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-muted-foreground">
                  {t("common.total")} · {t("common.items", { count: cart.count })}
                </span>
                <span className="tabular text-2xl font-bold">{formatPrice(cart.total)}</span>
              </div>
              <Button
                size="xl"
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`${base}/checkout`);
                }}
              >
                {t("c.checkout")}
              </Button>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
