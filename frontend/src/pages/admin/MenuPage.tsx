import { useMemo, useState } from "react";
import { Carrot, ChevronRight, FolderCog, Languages, Plus, Search, UtensilsCrossed, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ProductImage } from "@/components/ProductImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { AutoTranslateCard } from "@/features/admin/AutoTranslateCard";
import { useCategories, useProducts, useSaveProduct } from "@/features/admin/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLocalized, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import { formatPrice } from "@/utils/format";

export default function AdminMenuPage() {
  const { t } = useT();
  const l = useLocalized();
  const products = useProducts();
  const categories = useCategories();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [searchOpen, setSearchOpen] = useState(false);
  useDocumentTitle(t("a.menu.title"));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products.data ?? []).filter(
      (p) =>
        (categoryId === "all" || p.categoryId === categoryId) &&
        (!q || [p.name, p.nameEn, p.nameFr].some((n) => n?.toLowerCase().includes(q))),
    );
  }, [products.data, query, categoryId]);

  const noCategories = categories.data?.length === 0;

  return (
    <>
      <PageHeader
        title={t("a.menu.title")}
        subtitle={products.data ? t("common.dishes", { count: products.data.length }) : undefined}
        actions={
          <>
            <Button variant="ghost" size="icon" aria-label={t("a.menu.search")} aria-expanded={searchOpen} onClick={() => setSearchOpen((v) => !v)}>
              <Search />
            </Button>
            <Button asChild size="sm" className="h-10" disabled={noCategories}>
              <Link to="/admin/products/new">
                <Plus /> {t("common.add")}
              </Link>
            </Button>
          </>
        }
      />

      <div className="sticky top-16 z-20 space-y-3 bg-background/95 px-4 pb-3 backdrop-blur sm:px-6">
        {searchOpen && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("a.menu.searchPlaceholder")} className="pl-11 pr-11" aria-label={t("a.menu.search")} />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-muted-foreground" aria-label={t("a.menu.clearSearch")}>
                <X className="size-5" />
              </button>
            )}
          </div>
        )}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
          <Chip active={categoryId === "all"} onClick={() => setCategoryId("all")}>
            {t("a.menu.all")}
          </Chip>
          {categories.data?.map((c) => (
            <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)} muted={!c.isActive}>
              {l(c)}
              <span className="tabular ml-1 opacity-60">{c.productCount}</span>
            </Chip>
          ))}
          <Link to="/admin/categories" className="press flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-primary">
            <FolderCog className="size-4" aria-hidden /> {t("a.menu.manageCategories")}
          </Link>
          <Link to="/admin/ingredients" className="press flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-primary">
            <Carrot className="size-4" aria-hidden /> {t("a.menu.ingredients")}
          </Link>
        </div>
      </div>

      <div className="px-4 sm:px-6">
        <AutoTranslateCard className="mb-3" />
        {products.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] rounded-2xl" />
            ))}
          </div>
        ) : noCategories ? (
          <EmptyState
            icon={FolderCog}
            title={t("a.menu.noCategories")}
            description={t("a.menu.noCategoriesText")}
            action={
              <Button asChild>
                <Link to="/admin/categories">{t("a.menu.createCategory")}</Link>
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title={query ? t("a.menu.notFound") : t("a.menu.firstDish")}
            description={query ? t("a.menu.tryAnother") : t("a.menu.firstDishText")}
            action={
              !query && (
                <Button asChild>
                  <Link to="/admin/products/new">
                    <Plus /> {t("a.menu.addDish")}
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <ProductRow key={p.id} product={p} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function Chip({ active, muted, onClick, children }: { active: boolean; muted?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "press h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
        active ? "bg-foreground text-background" : "bg-card text-foreground/75 ring-1 ring-border",
        muted && !active && "opacity-60",
      )}
    >
      {children}
    </button>
  );
}

function ProductRow({ product }: { product: Product }) {
  const { t, lang } = useT();
  const l = useLocalized();
  const save = useSaveProduct();
  const name = l(product);
  const missingTranslation =
    !product.nameEn?.trim() || !product.nameFr?.trim() || (!!product.description && (!product.descriptionEn || !product.descriptionFr));
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const available = optimistic ?? product.isAvailable;

  async function toggle(next: boolean) {
    setOptimistic(next);
    try {
      await save.mutateAsync({ id: product.id, data: { isAvailable: next } });
      toast.success(t(next ? "a.menu.nowOnSale" : "a.menu.nowSoldOut", { name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("a.orders.updateFailed"));
    } finally {
      setOptimistic(null);
    }
  }

  return (
    <li className="relative flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft ring-1 ring-border/60">
      <ProductImage src={product.imageUrl} alt={name} className={cn("size-16 shrink-0 rounded-xl", !available && "opacity-50 grayscale")} />
      <Link to={`/admin/products/${product.id}/edit`} className="min-w-0 flex-1 after:absolute after:inset-0 after:rounded-2xl after:content-['']">
        <p className="truncate font-semibold">{name}</p>
        {lang !== "zh" && name !== product.name && (
          <p className="truncate text-xs text-muted-foreground" lang="zh">
            {product.name}
          </p>
        )}
        <p className="tabular text-[15px] font-bold">{formatPrice(product.price, product.currency)}</p>
        <p className="truncate text-xs text-muted-foreground">
          {product.categoryName}
          {!available && <span className="ml-1.5 font-semibold text-warning">· {t("a.menu.soldOut")}</span>}
          {missingTranslation && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 text-info">
              · <Languages className="size-3" aria-hidden /> {t("a.menu.missingTranslation")}
            </span>
          )}
        </p>
      </Link>
      <div className="relative z-10 flex flex-col items-center gap-1">
        <Switch checked={available} onCheckedChange={toggle} disabled={save.isPending} aria-label={t("a.menu.availability", { name })} />
        <span className="text-[11px] text-muted-foreground">{available ? t("a.menu.onSale") : t("a.menu.soldOut")}</span>
      </div>
      <ChevronRight className="size-5 text-muted-foreground/50" aria-hidden />
    </li>
  );
}
