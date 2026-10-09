import { useMemo, useState } from "react";
import { Carrot, Check, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { AutoTranslateCard } from "@/features/admin/AutoTranslateCard";
import { useIngredientMutations, useIngredients } from "@/features/admin/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import type { Ingredient } from "@/types";

/** Translate each ingredient once; every dish that uses it shows the translation. Fields save on blur. */
export default function IngredientsPage() {
  const { t } = useT();
  const ingredients = useIngredients();
  const [query, setQuery] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  useDocumentTitle(t("a.ing.title"));

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (ingredients.data ?? []).filter(
      (i) =>
        (!onlyMissing || !i.nameEn?.trim() || !i.nameFr?.trim()) &&
        (!q || [i.name, i.nameEn, i.nameFr].some((n) => n?.toLowerCase().includes(q))),
    );
  }, [ingredients.data, query, onlyMissing]);

  const missingCount = (ingredients.data ?? []).filter((i) => !i.nameEn?.trim() || !i.nameFr?.trim()).length;

  return (
    <>
      <PageHeader title={t("a.ing.title")} subtitle={t("a.ing.subtitle")} back="/admin/menu" />
      <div className="sticky top-16 z-20 space-y-2 bg-background/95 px-4 pb-3 backdrop-blur sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("a.ing.search")} aria-label={t("a.ing.search")} className="pl-11" />
        </div>
        <label className="flex items-center justify-between gap-3 px-1 text-sm">
          <span>
            {t("a.ing.filterMissing")}
            {missingCount > 0 && <span className="tabular ml-1.5 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">{missingCount}</span>}
          </span>
          <Switch checked={onlyMissing} onCheckedChange={setOnlyMissing} />
        </label>
      </div>
      <div className="px-4 sm:px-6">
        <AutoTranslateCard className="mb-3" />
        {ingredients.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : !ingredients.data?.length ? (
          <EmptyState icon={Carrot} title={t("a.ing.empty")} description={t("a.ing.emptyText")} />
        ) : list.length === 0 ? (
          <EmptyState icon={Check} title={onlyMissing ? t("a.ing.allDone") : t("a.menu.notFound")} />
        ) : (
          <ul className="space-y-2">
            {list.map((i) => (
              <IngredientRow key={`${i.id}|${i.nameEn ?? ""}|${i.nameFr ?? ""}`} ingredient={i} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function IngredientRow({ ingredient }: { ingredient: Ingredient & { productCount: number } }) {
  const { t } = useT();
  const m = useIngredientMutations();
  const [en, setEn] = useState(ingredient.nameEn ?? "");
  const [fr, setFr] = useState(ingredient.nameFr ?? "");
  const [saving, setSaving] = useState<"en" | "fr" | null>(null);

  async function save(field: "en" | "fr") {
    const value = (field === "en" ? en : fr).trim();
    const current = (field === "en" ? ingredient.nameEn : ingredient.nameFr) ?? "";
    if (value === current) return;
    setSaving(field);
    try {
      await m.update.mutateAsync({ id: ingredient.id, [field === "en" ? "nameEn" : "nameFr"]: value || null });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(null);
    }
  }

  return (
    <li className="rounded-2xl bg-card p-3 shadow-soft ring-1 ring-border/60">
      <div className="mb-2 flex items-center gap-2 px-1">
        <p className="flex-1 text-[17px] font-semibold" lang="zh">
          {ingredient.name}
        </p>
        <span className="text-xs text-muted-foreground">
          {ingredient.productCount ? t("a.ing.usedBy", { count: ingredient.productCount }) : t("a.ing.unused")}
        </span>
        {ingredient.productCount === 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive"
            aria-label={t("a.ing.deleteUnused")}
            onClick={() => m.remove.mutate(ingredient.id, { onError: (err) => toast.error(err.message) })}
          >
            <Trash2 />
          </Button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            ["en", "English", en, setEn],
            ["fr", "Français", fr, setFr],
          ] as const
        ).map(([field, label, value, setValue]) => (
          <label key={field} className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">{field.toUpperCase()}</span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => save(field)}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
              placeholder={label}
              aria-label={`${ingredient.name} · ${label}`}
              maxLength={80}
              lang={field}
              enterKeyHint="done"
              className="h-11 pl-10 pr-9"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden>
              {saving === field ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : value.trim() ? (
                <Check className="size-4 text-success" />
              ) : (
                <span className="block size-1.5 rounded-full bg-warning" />
              )}
            </span>
          </label>
        ))}
      </div>
    </li>
  );
}
