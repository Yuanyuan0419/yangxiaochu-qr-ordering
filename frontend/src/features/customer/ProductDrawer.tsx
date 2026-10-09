import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { DietaryBadges } from "@/components/DietaryBadges";
import { ProductImage } from "@/components/ProductImage";
import { QuantityStepper } from "@/components/QuantityStepper";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { useLocalized, useT } from "@/i18n";
import type { Product } from "@/types";
import { formatPrice, fromCents, toCents } from "@/utils/format";

interface Props {
  product: Product | null;
  onClose: () => void;
  onAdd: (product: Product, quantity: number) => void;
}

export function ProductDrawer({ product, onClose, onAdd }: Props) {
  const { t, lang } = useT();
  const l = useLocalized();
  const [quantity, setQuantity] = useState(1);
  // Keep showing the last product while the sheet animates closed.
  const [shown, setShown] = useState<Product | null>(product);

  useEffect(() => {
    if (product) {
      setShown(product);
      setQuantity(1);
    }
  }, [product]);

  const p = shown;
  return (
    <Drawer open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent hideHandle className="overflow-hidden">
        {p && (
          <>
            <div className="overflow-y-auto overscroll-contain">
              <div className="relative">
                <ProductImage src={p.imageUrl} alt={l(p)} priority className="aspect-[4/3] w-full" />
                <div className="absolute left-1/2 top-2.5 h-1.5 w-11 -translate-x-1/2 rounded-full bg-white/80 shadow" aria-hidden />
              </div>

              <div className="space-y-5 px-5 pb-6 pt-5">
                <div>
                  <DrawerTitle>{l(p)}</DrawerTitle>
                  {/* Show the original Chinese name too, so guests can point at it when talking to staff. */}
                  {lang !== "zh" && l(p) !== p.name && (
                    <p className="mt-0.5 text-sm text-muted-foreground" lang="zh">
                      {p.name}
                    </p>
                  )}
                  <p className="tabular mt-1.5 text-xl font-bold text-primary">{formatPrice(p.price, p.currency)}</p>
                  <DietaryBadges product={p} className="mt-3 flex flex-wrap gap-1.5" />
                </div>

                <DrawerDescription asChild>
                  <div className="text-[15px] leading-relaxed text-foreground/80">{l(p, "description") || t("c.noDescription")}</div>
                </DrawerDescription>

                {p.ingredients.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{t("c.ingredients")}</h3>
                    <ul className="flex flex-wrap gap-1.5">
                      {p.ingredients.map((i) => (
                        <li key={i.id} className="rounded-full bg-secondary px-3 py-1 text-sm">
                          {l(i)}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{t("c.allergens")}</h3>
                  {p.allergens.length ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {p.allergens.map((a) => (
                        <li key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-sm text-warning">
                          <AlertTriangle className="size-3.5" aria-hidden />
                          {l(a)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("c.noAllergens")}</p>
                  )}
                </section>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t bg-card px-5 pt-3 pb-safe">
              {p.isAvailable ? (
                <>
                  <QuantityStepper value={quantity} onChange={setQuantity} size="lg" label={l(p)} />
                  <Button
                    size="xl"
                    className="min-w-0 flex-1"
                    onClick={() => {
                      onAdd(p, quantity);
                      onClose();
                    }}
                  >
                    <span className="truncate">{t("c.addShort")}</span>
                    <span className="tabular">· {formatPrice(fromCents(toCents(p.price) * quantity), p.currency)}</span>
                  </Button>
                </>
              ) : (
                <Button size="xl" className="flex-1" disabled>
                  {t("c.soldOut")}
                </Button>
              )}
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
