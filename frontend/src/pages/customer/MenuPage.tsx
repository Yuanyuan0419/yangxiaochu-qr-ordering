import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Clock, MapPin, ReceiptText, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RestaurantLogo } from "@/components/RestaurantLogo";
import { CartDrawer } from "@/features/customer/CartDrawer";
import { MenuError, MenuSkeleton } from "@/features/customer/MenuStatus";
import { ProductCard } from "@/features/customer/ProductCard";
import { ProductDrawer } from "@/features/customer/ProductDrawer";
import { useMenu, useTableBill } from "@/features/customer/queries";
import { useTableParams } from "@/features/customer/useTableParams";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLocalized, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { useCartStore, useTableCart } from "@/store/cart";
import type { Product } from "@/types";
import { formatPrice } from "@/utils/format";
import { toast } from "sonner";

const NAV_OFFSET = 64;

export default function MenuPage() {
  const { slug, token, cartKey, base } = useTableParams();
  const menu = useMenu(slug, token);
  const cart = useTableCart(cartKey);
  const add = useCartStore((s) => s.add);
  const sync = useCartStore((s) => s.sync);
  const bill = useTableBill(slug, token, 15_000);
  const { t } = useT();
  const l = useLocalized();

  const [selected, setSelected] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const clickScrolling = useRef(false);

  useDocumentTitle(menu.data ? `${l(menu.data.restaurant)} · ${t("common.tableN", { n: menu.data.table.tableNumber })}` : "…");

  const products = useMemo(() => menu.data?.categories.flatMap((c) => c.products) ?? [], [menu.data]);
  const qtyById = useMemo(() => new Map(cart.lines.map((l) => [l.productId, l.quantity])), [cart.lines]);

  // Keep cart names/prices in step with the latest menu.
  useEffect(() => {
    if (products.length) sync(cartKey, products);
  }, [products, cartKey, sync]);

  // Scroll-spy: highlight the category whose section is under the sticky nav.
  useEffect(() => {
    const categories = menu.data?.categories;
    if (!categories?.length) return;
    setActiveCategory((c) => c ?? categories[0].id);
    const observer = new IntersectionObserver(
      (entries) => {
        if (clickScrolling.current) return;
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveCategory(Number((visible[0].target as HTMLElement).dataset.categoryId));
      },
      { rootMargin: `-${NAV_OFFSET + 8}px 0px -65% 0px` },
    );
    categories.forEach((c) => {
      const el = document.getElementById(`cat-${c.id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [menu.data?.categories]);

  // Keep the active chip visible in the horizontal nav.
  useEffect(() => {
    const chip = navRef.current?.querySelector<HTMLElement>(`[data-chip="${activeCategory}"]`);
    chip?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeCategory]);

  function jumpTo(categoryId: number) {
    setActiveCategory(categoryId);
    clickScrolling.current = true;
    document.getElementById(`cat-${categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => (clickScrolling.current = false), 700);
  }

  function addToCart(product: Product, quantity = 1) {
    add(cartKey, product, quantity);
    navigator.vibrate?.(10);
    toast.success(t("c.added", { name: `${l(product)}${quantity > 1 ? ` × ${quantity}` : ""}` }), { duration: 1500 });
  }

  if (menu.isPending) return <MenuSkeleton />;
  if (menu.isError) return <MenuError error={menu.error} onRetry={() => menu.refetch()} />;

  const { restaurant, table, categories } = menu.data;

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-32">
      <header className="px-4 pb-4 pt-5">
        <div className="mb-3 flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="flex items-center gap-3">
          <RestaurantLogo name={restaurant.name} logoUrl={restaurant.logoUrl} className="size-14" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight">{l(restaurant)}</h1>
            {l(restaurant, "description") && <p className="line-clamp-2 text-sm text-muted-foreground">{l(restaurant, "description")}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-center rounded-2xl bg-primary px-3 py-1.5 text-primary-foreground">
            <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">{t("common.table")}</span>
            <span className="tabular text-xl font-bold leading-none">{table.tableNumber}</span>
          </div>
        </div>
        {(restaurant.address || l(restaurant, "openingHours")) && (
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            {restaurant.address && (
              <p className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {restaurant.address}
              </p>
            )}
            {l(restaurant, "openingHours") && (
              <p className="flex items-start gap-1.5">
                <Clock className="mt-px size-3.5 shrink-0" aria-hidden />
                <span className="whitespace-pre-line">{l(restaurant, "openingHours")}</span>
              </p>
            )}
          </div>
        )}
        {bill.data?.session && (
          <Link to={`${base}/bill`} className="press mt-4 flex items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-accent-foreground">
            <ReceiptText className="size-5 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t("c.myOrder")}</span>
              <span className="tabular block text-xs opacity-80">
                {(() => {
                  const items = bill.data.session.orders.filter((o) => o.status !== "CANCELLED").flatMap((o) => o.items);
                  const served = items.filter((i) => i.servedAt).length;
                  return served === items.length && items.length ? t("c.allServed") : t("c.servedProgress", { served, total: items.length });
                })()}{" "}
                · {formatPrice(bill.data.session.totalAmount)}
              </span>
            </span>
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        )}
      </header>

      {categories.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title={t("c.emptyMenuTitle")} description={t("c.emptyMenuText")} />
      ) : (
        <>
          <nav
            ref={navRef}
            aria-label={t("c.categoriesNav")}
            className="no-scrollbar sticky top-0 z-30 flex gap-2 overflow-x-auto border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur"
          >
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                data-chip={c.id}
                onClick={() => jumpTo(c.id)}
                aria-current={activeCategory === c.id ? "true" : undefined}
                className={cn(
                  "press h-10 shrink-0 rounded-full px-4 text-[15px] font-semibold transition-colors",
                  activeCategory === c.id ? "bg-foreground text-background" : "bg-card text-foreground/80 ring-1 ring-border",
                )}
              >
                {l(c)}
              </button>
            ))}
          </nav>

          <main className="space-y-8 px-4 pt-5">
            {categories.map((c, ci) => (
              <section key={c.id} id={`cat-${c.id}`} data-category-id={c.id} style={{ scrollMarginTop: NAV_OFFSET }} aria-labelledby={`cat-h-${c.id}`}>
                <div className="mb-3 flex items-baseline gap-2">
                  <h2 id={`cat-h-${c.id}`} className="text-lg font-bold">
                    {l(c)}
                  </h2>
                  {l(c, "description") && <span className="text-sm text-muted-foreground">{l(c, "description")}</span>}
                </div>
                <div className="space-y-3">
                  {c.products.map((p, pi) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      priority={ci === 0 && pi < 3}
                      quantityInCart={qtyById.get(p.id) ?? 0}
                      onOpen={() => setSelected(p)}
                      onQuickAdd={() => addToCart(p)}
                    />
                  ))}
                </div>
              </section>
            ))}
            <p className="pb-4 pt-2 text-center text-xs text-muted-foreground">{t("c.allergyNotice")}</p>
          </main>
        </>
      )}

      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-4 pb-safe">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="press flex h-16 w-full animate-pop-in items-center gap-3 rounded-full bg-foreground pl-2 pr-6 text-background shadow-lift"
          >
            <span className="relative grid size-12 place-items-center rounded-full bg-primary">
              <ShoppingBag className="size-5" aria-hidden />
              <span
                key={cart.count}
                className="tabular absolute -right-1 -top-1 grid min-w-6 animate-bump place-items-center rounded-full bg-background px-1.5 text-xs font-bold text-foreground"
              >
                {cart.count}
              </span>
            </span>
            <span className="tabular flex-1 text-left text-lg font-bold">{formatPrice(cart.total)}</span>
            <span className="font-semibold">{t("c.viewCart")}</span>
          </button>
        </div>
      )}

      <ProductDrawer product={selected} onClose={() => setSelected(null)} onAdd={addToCart} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} tableNumber={table.tableNumber} />
    </div>
  );
}
