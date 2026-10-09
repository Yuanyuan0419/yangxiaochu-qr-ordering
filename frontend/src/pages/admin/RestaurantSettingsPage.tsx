import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";
import { PageHeader } from "@/components/PageHeader";
import { TranslatableFields } from "@/components/TranslatableFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useRestaurant, useRestaurantMutations } from "@/features/admin/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import type { Restaurant } from "@/types";

const TEXT_FIELDS = [
  "name",
  "nameEn",
  "nameFr",
  "description",
  "descriptionEn",
  "descriptionFr",
  "address",
  "phone",
  "openingHours",
  "openingHoursEn",
  "openingHoursFr",
] as const;
type Form = Record<(typeof TEXT_FIELDS)[number], string>;

export default function RestaurantSettingsPage() {
  const { t } = useT();
  const restaurant = useRestaurant();
  const m = useRestaurantMutations();
  const [form, setForm] = useState<Form | null>(null);
  const [nameError, setNameError] = useState<string | undefined>();
  useDocumentTitle(t("a.rest.title"));

  useEffect(() => {
    if (restaurant.data && !form) {
      const r = restaurant.data;
      setForm(Object.fromEntries(TEXT_FIELDS.map((k) => [k, (r[k as keyof Restaurant] as string | null) ?? ""])) as Form);
    }
  }, [restaurant.data, form]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.name.trim()) {
      setNameError(t("a.rest.nameRequired"));
      document.getElementById("r-name")?.focus();
      return;
    }
    try {
      const data = Object.fromEntries(TEXT_FIELDS.map((k) => [k, form[k].trim() || null])) as Partial<Restaurant>;
      await m.update.mutateAsync(data);
      toast.success(t("a.rest.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function toggleAutoAccept(value: boolean) {
    try {
      await m.update.mutateAsync({ autoAcceptOrders: value });
      toast.success(value ? t("a.rest.autoAcceptOn") : t("a.rest.autoAcceptOff"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  const set = (key: string, value: string) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    if (key === "name") setNameError(undefined);
  };

  return (
    <form onSubmit={save} noValidate className="pb-40 lg:pb-24">
      <PageHeader title={t("a.rest.title")} back="/admin/settings" />
      <div className="space-y-4 px-4 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>{t("a.rest.logoHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            {restaurant.isPending ? (
              <Skeleton className="size-36 rounded-2xl" />
            ) : (
              <ImageUploader
                label="Logo"
                aspect="square"
                emptyHint={t("a.rest.uploadLogo")}
                value={restaurant.data?.logoUrl ?? null}
                onUpload={async (file) => {
                  await m.uploadLogo.mutateAsync(file);
                  toast.success(t("a.rest.logoUpdated"));
                }}
                onRemove={async () => {
                  await m.removeLogo.mutateAsync();
                  toast.success(t("a.rest.logoRemoved"));
                }}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("a.rest.orders")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 pb-4 sm:px-5">
              <span className="flex-1">
                <span className="block font-medium">{t("a.rest.autoAccept")}</span>
                <span className="block text-sm text-muted-foreground">{t("a.rest.autoAcceptHint")}</span>
              </span>
              <Switch
                checked={restaurant.data?.autoAcceptOrders ?? false}
                onCheckedChange={toggleAutoAccept}
                disabled={!restaurant.data || m.update.isPending}
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("a.rest.basic")}</CardTitle>
            <CardDescription>{t("a.product.basicHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            {!form ? (
              <Skeleton className="h-48" />
            ) : (
              <TranslatableFields
                idPrefix="r"
                kind="restaurant"
                values={form}
                errors={{ name: nameError }}
                onChange={set}
                fields={[
                  { key: "name", label: t("a.rest.name"), required: true, maxLength: 120 },
                  { key: "description", label: t("a.rest.description"), multiline: true, maxLength: 1000, placeholder: t("a.rest.descPlaceholder") },
                ]}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("a.rest.contact")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!form ? (
              <Skeleton className="h-48" />
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="r-address">{t("a.rest.address")}</Label>
                  <Input id="r-address" value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={255} autoComplete="street-address" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-phone">{t("a.rest.phone")}</Label>
                  <Input id="r-phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={50} autoComplete="tel" />
                </div>
                <TranslatableFields
                  idPrefix="r"
                  kind="hours"
                  values={form}
                  onChange={set}
                  fields={[{ key: "openingHours", label: t("a.rest.hours"), multiline: true, maxLength: 1000, placeholder: t("a.rest.hoursPlaceholder") }]}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-card/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto max-w-3xl">
          <Button type="submit" size="xl" className="w-full" loading={m.update.isPending} loadingText={t("common.saving")} disabled={!form}>
            {t("common.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
