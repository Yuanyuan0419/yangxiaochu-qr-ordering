import { Plus } from "lucide-react";
import { DietaryBadges } from "@/components/DietaryBadges";
import { ProductImage } from "@/components/ProductImage";
import { useLocalized, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import { formatPrice } from "@/utils/format";

interface Props {
  product: Product;
  quantityInCart: number;
  onOpen: () => void;
  onQuickAdd: () => void;
  priority?: boolean;
}

export function ProductCard({ product, quantityInCart, onOpen, onQuickAdd, priority }: Props) {
  const { t } = useT();
  const l = useLocalized();
  const soldOut = !product.isAvailable;
  const name = l(product);
  const description = l(product, "description");
  return (
    <article className={cn("relative flex gap-3 rounded-2xl bg-card p-3 shadow-soft ring-1 ring-border/60", soldOut && "bg-card/70")}>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Stretched button: the whole card opens the detail sheet. */}
        <button type="button" onClick={onOpen} className="text-left after:absolute after:inset-0 after:rounded-2xl after:content-['']">
          <h3 className={cn("line-clamp-2 text-[16px] font-semibold leading-snug", soldOut && "text-muted-foreground")}>{name}</h3>
        </button>
        {description && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
        <DietaryBadges product={product} className="mt-2 flex flex-wrap gap-1" />
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <span className={cn("tabular text-[17px] font-bold", soldOut ? "text-muted-foreground" : "text-foreground")}>
            {formatPrice(product.price, product.currency)}
          </span>
          {soldOut && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{t("c.soldOut")}</span>}
        </div>
      </div>

      <div className="relative shrink-0">
        <ProductImage
          src={product.imageUrl}
          alt={name}
          priority={priority}
          className={cn("size-[104px] rounded-xl", soldOut && "opacity-60 grayscale")}
        />
        {!soldOut && (
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label={t("c.addToCartAria", { name })}
            className="press absolute -bottom-1.5 -right-1.5 z-10 grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift ring-4 ring-card"
          >
            {quantityInCart > 0 ? (
              <span key={quantityInCart} className="tabular animate-bump text-sm font-bold">
                {quantityInCart}
              </span>
            ) : (
              <Plus className="size-5" strokeWidth={2.5} />
            )}
          </button>
        )}
      </div>
    </article>
  );
}
