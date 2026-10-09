import { useState } from "react";
import { ArrowDown, ArrowUp, FolderPlus, Languages, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { TranslatableFields } from "@/components/TranslatableFields";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useCategories, useCategoryMutations } from "@/features/admin/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLocalized, useT } from "@/i18n";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const { t, lang } = useT();
  const l = useLocalized();
  const categories = useCategories();
  const m = useCategoryMutations();
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  useDocumentTitle(t("a.cat.title"));

  const list = categories.data ?? [];

  function move(index: number, delta: number) {
    const ids = list.map((c) => c.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    m.reorder.mutate(ids, { onError: (err) => toast.error(err.message) });
  }

  async function toggleActive(c: Category, isActive: boolean) {
    try {
      await m.update.mutateAsync({ id: c.id, isActive });
      toast.success(t(isActive ? "a.cat.shown" : "a.cat.hiddenToast", { name: l(c) }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("a.orders.updateFailed"));
    }
  }

  return (
    <>
      <PageHeader
        title={t("a.cat.title")}
        subtitle={t("a.cat.subtitle")}
        back="/admin/menu"
        actions={
          <Button size="sm" className="h-10" onClick={() => setEditing("new")}>
            <Plus /> {t("a.cat.new")}
          </Button>
        }
      />
      <div className="px-4 sm:px-6">
        {categories.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-2xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={FolderPlus}
            title={t("a.cat.empty")}
            description={t("a.cat.emptyText")}
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus /> {t("a.cat.createFirst")}
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {list.map((c, i) => {
              const missing = !c.nameEn?.trim() || !c.nameFr?.trim();
              return (
                <li key={c.id} className="flex items-center gap-2 rounded-2xl bg-card p-2 pl-4 shadow-soft ring-1 ring-border/60">
                  <div className="min-w-0 flex-1 py-1">
                    <p className={`truncate font-semibold ${c.isActive ? "" : "text-muted-foreground"}`}>{l(c)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lang !== "zh" && l(c) !== c.name && <span lang="zh">{c.name} · </span>}
                      {t("common.dishes", { count: c.productCount })}
                      {!c.isActive && ` · ${t("a.cat.hidden")}`}
                      {missing && (
                        <span className="ml-1 inline-flex items-center gap-0.5 text-info">
                          · <Languages className="size-3" aria-hidden /> {t("a.menu.missingTranslation")}
                        </span>
                      )}
                    </p>
                  </div>
                  <Switch checked={c.isActive} onCheckedChange={(v) => toggleActive(c, v)} aria-label={t("a.cat.visibleAria", { name: l(c) })} className="mx-2" />
                  <div className="flex flex-col">
                    <button
                      type="button"
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      aria-label={t("a.cat.moveUp", { name: l(c) })}
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30"
                      disabled={i === list.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label={t("a.cat.moveDown", { name: l(c) })}
                    >
                      <ArrowDown className="size-4" />
                    </button>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`${l(c)} · ${t("common.more")}`}>
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditing(c)}>
                        <Pencil /> {t("common.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setDeleting(c)}>
                        <Trash2 /> {t("common.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <CategoryDialog value={editing} onClose={() => setEditing(null)} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleting && t("a.cat.deleteTitle", { name: l(deleting) })}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && deleting.productCount > 0 ? t("a.cat.notEmptyText", { count: deleting.productCount }) : t("a.cat.irreversible")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={deleting && deleting.productCount > 0 ? "grid-cols-1" : undefined}>
            <AlertDialogCancel>{deleting && deleting.productCount > 0 ? t("common.gotIt") : t("common.cancel")}</AlertDialogCancel>
            {deleting && deleting.productCount === 0 && (
              <AlertDialogAction
                destructive
                onClick={() =>
                  m.remove.mutate(deleting.id, {
                    onSuccess: () => toast.success(t("common.deleted")),
                    onError: (err) => toast.error(err.message),
                  })
                }
              >
                {t("common.delete")}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const FIELDS = ["name", "nameEn", "nameFr", "description", "descriptionEn", "descriptionFr"] as const;
type Values = Record<(typeof FIELDS)[number], string>;
const emptyValues = (): Values => ({ name: "", nameEn: "", nameFr: "", description: "", descriptionEn: "", descriptionFr: "" });

function CategoryDialog({ value, onClose }: { value: Category | "new" | null; onClose: () => void }) {
  const { t } = useT();
  const m = useCategoryMutations();
  const [values, setValues] = useState<Values>(emptyValues);
  const [error, setError] = useState<string | null>(null);
  const [lastValue, setLastValue] = useState(value);
  const isNew = value === "new";

  // Reset fields whenever the dialog opens for a different category.
  if (value !== lastValue) {
    setLastValue(value);
    const next = emptyValues();
    if (value && value !== "new") for (const k of FIELDS) next[k] = value[k] ?? "";
    setValues(next);
    setError(null);
  }

  const pending = m.create.isPending || m.update.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) {
      setError(t("a.v.name"));
      return;
    }
    const data = Object.fromEntries(FIELDS.map((k) => [k, values[k].trim() || null])) as Record<string, string | null>;
    data.name = values.name.trim();
    try {
      if (isNew) await m.create.mutateAsync(data as Partial<Category>);
      else if (value) await m.update.mutateAsync({ id: value.id, ...(data as Partial<Category>) });
      toast.success(isNew ? t("a.cat.created") : t("common.saved"));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    }
  }

  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{isNew ? t("a.cat.newTitle") : t("a.cat.editTitle")}</DialogTitle>
            <DialogDescription>{t("a.cat.dialogHint")}</DialogDescription>
          </DialogHeader>
          <TranslatableFields
            idPrefix="cat"
            kind="category"
            values={values}
            errors={{ name: error ?? undefined }}
            onChange={(key, v) => {
              setValues((s) => ({ ...s, [key]: v }));
              setError(null);
            }}
            fields={[
              { key: "name", label: t("a.cat.name"), required: true, maxLength: 80, placeholder: t("a.cat.namePlaceholder") },
              { key: "description", label: `${t("a.cat.description")} (${t("common.optional")})`, maxLength: 255, placeholder: t("a.cat.descPlaceholder") },
            ]}
          />
          <DialogFooter>
            <Button type="submit" size="lg" loading={pending} loadingText={t("common.saving")}>
              {isNew ? t("common.create") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
