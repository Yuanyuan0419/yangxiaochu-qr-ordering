import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, Trash2, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  uploadProductImage,
  useAllergens,
  useCategories,
  useDeleteProduct,
  useIngredients,
  useProduct,
  useSaveProduct,
} from "@/features/admin/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useLocalized, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services/api";
import type { Product } from "@/types";

interface Form {
  name: string;
  nameEn: string;
  nameFr: string;
  description: string;
  descriptionEn: string;
  descriptionFr: string;
  categoryId: string;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isSpicy: boolean;
  isGlutenFree: boolean;
  ingredients: string[];
  allergenIds: number[];
}

const EMPTY: Form = {
  name: "",
  nameEn: "",
  nameFr: "",
  description: "",
  descriptionEn: "",
  descriptionFr: "",
  categoryId: "",
  price: "",
  imageUrl: null,
  isAvailable: true,
  isVegetarian: false,
  isVegan: false,
  isSpicy: false,
  isGlutenFree: false,
  ingredients: [],
  allergenIds: [],
};

const fromProduct = (p: Product): Form => ({
  name: p.name,
  nameEn: p.nameEn ?? "",
  nameFr: p.nameFr ?? "",
  description: p.description ?? "",
  descriptionEn: p.descriptionEn ?? "",
  descriptionFr: p.descriptionFr ?? "",
  categoryId: String(p.categoryId),
  price: p.price,
  imageUrl: p.imageUrl,
  isAvailable: p.isAvailable,
  isVegetarian: p.isVegetarian,
  isVegan: p.isVegan,
  isSpicy: p.isSpicy,
  isGlutenFree: p.isGlutenFree,
  ingredients: p.ingredients.map((i) => i.name),
  allergenIds: p.allergens.map((a) => a.id),
});

const PRICE_RE = /^\d{1,8}([.,]\d{1,2})?$/;
type Errors = Partial<Record<string, string>>;

export default function ProductFormPage() {
  const { t } = useT();
  const l = useLocalized();
  const params = useParams();
  const id = params.id ? Number(params.id) : null;
  const isEdit = id !== null;
  const product = useProduct(id);
  const categories = useCategories();
  const navigate = useNavigate();
  const save = useSaveProduct();

  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [loaded, setLoaded] = useState(!isEdit);
  const title = isEdit ? t("a.product.editTitle") : t("a.product.newTitle");
  useDocumentTitle(title);

  useEffect(() => {
    if (product.data && !loaded) {
      setForm(fromProduct(product.data));
      setLoaded(true);
    }
  }, [product.data, loaded]);

  // Default the category for new products.
  useEffect(() => {
    if (!isEdit && !form.categoryId && categories.data?.length) {
      setForm((f) => ({ ...f, categoryId: String(categories.data![0].id) }));
    }
  }, [isEdit, categories.data, form.categoryId]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function validate(f: Form): Errors {
    const e: Errors = {};
    if (!f.name.trim()) e.name = t("a.v.name");
    if (!f.categoryId) e.categoryId = t("a.v.category");
    if (!f.price.trim()) e.price = t("a.v.price");
    else if (!PRICE_RE.test(f.price.trim()) || Number(f.price.replace(",", ".")) <= 0) e.price = t("a.v.priceInvalid");
    return e;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    const firstError = Object.keys(v)[0];
    if (firstError) {
      document.getElementById(`field-${firstError}`)?.focus();
      return;
    }
    try {
      const saved = await save.mutateAsync({
        id: id ?? undefined,
        data: {
          ...form,
          categoryId: Number(form.categoryId),
          price: form.price.trim().replace(",", "."),
          nameEn: form.nameEn.trim() || null,
          nameFr: form.nameFr.trim() || null,
          description: form.description.trim() || null,
          descriptionEn: form.descriptionEn.trim() || null,
          descriptionFr: form.descriptionFr.trim() || null,
        },
      });
      toast.success(isEdit ? t("a.product.savedChanges") : t("a.product.created", { name: l(saved) }));
      navigate("/admin/menu");
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  if (isEdit && (product.isPending || product.isError || !loaded)) {
    return (
      <>
        <PageHeader title={title} back="/admin/menu" />
        {product.isError ? (
          <p className="py-16 text-center text-muted-foreground">{product.error.message}</p>
        ) : (
          <div className="space-y-4 px-4">
            <Skeleton className="aspect-[4/3] rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        )}
      </>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="pb-40 lg:pb-24">
      <PageHeader title={title} back="/admin/menu" />

      <div className="space-y-4 px-4 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("a.product.photo")}</CardTitle>
            <CardDescription>{t("a.product.photoHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploader
              label={t("a.product.photo")}
              value={form.imageUrl}
              onUpload={async (file) => {
                const { url } = await uploadProductImage(file);
                set("imageUrl", url);
                toast.success(t("a.product.photoUploaded"));
              }}
              onRemove={() => set("imageUrl", null)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("a.product.basic")}</CardTitle>
            <CardDescription>{t("a.product.basicHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <TranslatableFields
              idPrefix="field"
              kind="dish"
              values={form as unknown as Record<string, string>}
              errors={errors}
              onChange={(key, value) => set(key as keyof Form, value as never)}
              fields={[
                { key: "name", label: t("a.product.name"), required: true, maxLength: 120, placeholder: t("a.product.namePlaceholder") },
                { key: "description", label: t("a.product.description"), multiline: true, maxLength: 2000, placeholder: t("a.product.descriptionPlaceholder") },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t("a.product.category")} · {t("a.product.price")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label={t("a.product.category")}
              required
              error={errors.categoryId}
              htmlFor="field-categoryId"
              hint={
                <Link to="/admin/categories" className="font-semibold text-primary">
                  {t("a.menu.manageCategories")}
                </Link>
              }
            >
              <NativeSelect id="field-categoryId" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} aria-invalid={!!errors.categoryId}>
                <option value="" disabled>
                  {t("a.product.chooseCategory")}
                </option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {l(c)}
                    {!c.isActive ? t("a.product.hiddenCategory") : ""}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label={t("a.product.priceLabel")} required error={errors.price} htmlFor="field-price">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">€</span>
                <Input
                  id="field-price"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value.replace(/[^\d.,]/g, ""))}
                  placeholder="12.50"
                  className="tabular pl-9 text-lg font-semibold"
                  aria-invalid={!!errors.price}
                />
              </div>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("a.product.ingredients")}</CardTitle>
            <CardDescription>
              {t("a.product.ingredientsHint")}{" "}
              <Link to="/admin/ingredients" className="font-semibold text-primary">
                {t("a.menu.ingredients")} →
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IngredientsInput value={form.ingredients} onChange={(v) => set("ingredients", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("a.product.allergens")}</CardTitle>
            <CardDescription>{t("a.product.allergensHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AllergenPicker value={form.allergenIds} onChange={(v) => set("allergenIds", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("a.product.tagsStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0 sm:p-0">
            <ToggleRow label={t("a.product.available")} description={t("a.product.availableHint")} checked={form.isAvailable} onChange={(v) => set("isAvailable", v)} />
            <ToggleRow label={t("tag.spicy")} checked={form.isSpicy} onChange={(v) => set("isSpicy", v)} />
            <ToggleRow label={t("tag.vegetarian")} checked={form.isVegetarian || form.isVegan} disabled={form.isVegan} onChange={(v) => set("isVegetarian", v)} />
            <ToggleRow label={t("tag.vegan")} description={t("a.product.veganHint")} checked={form.isVegan} onChange={(v) => set("isVegan", v)} />
            <ToggleRow label={t("tag.glutenFree")} checked={form.isGlutenFree} onChange={(v) => set("isGlutenFree", v)} />
          </CardContent>
        </Card>

        {isEdit && id && <DeleteProduct id={id} name={form.name} />}
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-card/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto max-w-3xl">
          <Button type="submit" size="xl" className="w-full" loading={save.isPending} loadingText={isEdit ? t("common.saving") : t("a.product.creating")}>
            {isEdit ? t("a.product.saveChanges") : t("a.product.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: React.ReactNode;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-primary">*</span>}
        </Label>
        {hint && <span className="text-sm">{hint}</span>}
      </div>
      {children}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 sm:px-5">
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {description && <span className="block text-sm text-muted-foreground">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}

function IngredientsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useT();
  const l = useLocalized();
  const [draft, setDraft] = useState("");
  const known = useIngredients();
  const byName = useMemo(() => new Map((known.data ?? []).map((i) => [i.name, i])), [known.data]);

  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return (known.data ?? [])
      .filter((i) => !value.includes(i.name) && (!q || [i.name, i.nameEn, i.nameFr].some((n) => n?.toLowerCase().includes(q))))
      .sort((a, b) => b.productCount - a.productCount)
      .slice(0, 12);
  }, [known.data, value, draft]);

  function add(raw: string) {
    const names = raw
      .split(/[,，、]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const next = [...value];
    for (const n of names) if (!next.includes(n) && n.length <= 80) next.push(n);
    onChange(next.slice(0, 40));
    setDraft("");
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t("a.product.addedIngredients")}>
          {value.map((name) => {
            const known = byName.get(name);
            const shown = known ? l(known) : name;
            return (
              <li key={name} className="flex items-center gap-1 rounded-full bg-secondary py-1 pl-3.5 pr-1 text-[15px]">
                {shown}
                {shown !== name && (
                  <span className="text-xs text-muted-foreground" lang="zh">
                    {name}
                  </span>
                )}
                {!known && <span className="ml-1 rounded-full bg-info-soft px-1.5 text-[10px] font-semibold text-info">{t("a.product.newIngredient")}</span>}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v !== name))}
                  className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-card"
                  aria-label={t("a.product.removeIngredient", { name: shown })}
                >
                  <X className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder={t("a.product.ingredientPlaceholder")}
          aria-label={t("a.product.newIngredient")}
          enterKeyHint="done"
          lang="zh"
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-12 shrink-0 rounded-xl"
          onClick={() => add(draft)}
          disabled={!draft.trim()}
          aria-label={t("a.product.addIngredient")}
        >
          <Plus />
        </Button>
      </div>
      {suggestions.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-muted-foreground">{t("a.product.commonIngredients")}</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button key={s.id} type="button" onClick={() => add(s.name)} className="press rounded-full px-3 py-1.5 text-sm ring-1 ring-border hover:bg-muted">
                + {l(s)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AllergenPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const { lang } = useT();
  const allergens = useAllergens();
  if (allergens.isPending) return <Skeleton className="h-48" />;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {allergens.data?.map((a) => {
        const on = value.includes(a.id);
        // Primary label in the UI language, secondary in the other two.
        const names = { zh: a.name, en: a.nameEn, fr: a.nameFr };
        const others = (["zh", "en", "fr"] as const).filter((x) => x !== lang).map((x) => names[x]);
        return (
          <button
            key={a.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== a.id) : [...value, a.id])}
            className={cn(
              "press flex min-h-12 items-center gap-2 rounded-xl px-3 py-1.5 text-left ring-1 transition-colors",
              on ? "bg-warning-soft text-warning ring-warning/40" : "bg-card ring-border hover:bg-muted",
            )}
          >
            <AlertTriangle className={cn("size-4 shrink-0", on ? "opacity-100" : "opacity-25")} aria-hidden />
            <span className="min-w-0 leading-tight">
              <span className="block text-[15px] font-medium text-foreground">{names[lang]}</span>
              <span className="block truncate text-xs text-muted-foreground">{others.join(" · ")}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DeleteProduct({ id, name }: { id: number; name: string }) {
  const { t } = useT();
  const remove = useDeleteProduct();
  const navigate = useNavigate();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" className="w-full text-destructive">
          <Trash2 /> {t("a.product.delete")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("a.product.deleteTitle", { name })}</AlertDialogTitle>
          <AlertDialogDescription>{t("a.product.deleteText")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            destructive
            onClick={async () => {
              try {
                await remove.mutateAsync(id);
                toast.success(t("common.deleted"));
                navigate("/admin/menu", { replace: true });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : t("common.error"));
              }
            }}
          >
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
