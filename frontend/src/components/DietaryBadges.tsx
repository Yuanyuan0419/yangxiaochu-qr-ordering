import { Flame, Leaf, Sprout, WheatOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n";
import type { Product } from "@/types";

type Flags = Pick<Product, "isSpicy" | "isVegetarian" | "isVegan" | "isGlutenFree">;

export function DietaryBadges({ product, className }: { product: Flags; className?: string }) {
  const { t } = useT();
  const badges = [];
  if (product.isSpicy)
    badges.push(
      <Badge key="spicy" variant="soft">
        <Flame aria-hidden />
        {t("tag.spicy")}
      </Badge>,
    );
  if (product.isVegan)
    badges.push(
      <Badge key="vegan" variant="success">
        <Sprout aria-hidden />
        {t("tag.vegan")}
      </Badge>,
    );
  else if (product.isVegetarian)
    badges.push(
      <Badge key="veg" variant="success">
        <Leaf aria-hidden />
        {t("tag.vegetarian")}
      </Badge>,
    );
  if (product.isGlutenFree)
    badges.push(
      <Badge key="gf" variant="warning">
        <WheatOff aria-hidden />
        {t("tag.glutenFree")}
      </Badge>,
    );
  if (!badges.length) return null;
  return <div className={className ?? "flex flex-wrap gap-1.5"}>{badges}</div>;
}
