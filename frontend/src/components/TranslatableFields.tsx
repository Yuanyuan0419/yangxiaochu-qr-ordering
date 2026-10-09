import { useId, useState } from "react";
import { Check, Languages, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LANG_LABEL, LANGS, useT, type Lang } from "@/i18n";
import { useTranslate, useTranslateStatus, type TranslateKind } from "@/features/admin/queries";
import { cn } from "@/lib/utils";

export interface TranslatableField {
  /** Base field name, e.g. "name" → also edits "nameEn" / "nameFr". */
  key: string;
  label: string;
  required?: boolean;
  multiline?: boolean;
  maxLength: number;
  placeholder?: string;
}

interface Props {
  fields: TranslatableField[];
  values: Record<string, string | null | undefined>;
  onChange: (key: string, value: string) => void;
  errors?: Record<string, string | undefined>;
  /** Prefix for input ids so the first invalid field can be focused (`${idPrefix}-${key}`). */
  idPrefix: string;
  /** Enables DeepL auto-translation with the matching context. */
  kind?: TranslateKind;
}

const suffix = (lang: Lang) => (lang === "zh" ? "" : lang === "en" ? "En" : "Fr");

/**
 * Language tabs (中文 / English / Français) over a group of fields. Chinese is the required base;
 * translations are optional and the tab shows a check once every field that has Chinese text is translated.
 */
export function TranslatableFields({ fields, values, onChange, errors = {}, idPrefix, kind }: Props) {
  const { t } = useT();
  const [tab, setTab] = useState<Lang>("zh");
  const tabsId = useId();
  const status = useTranslateStatus();
  const translate = useTranslate();
  const canTranslate = !!kind && !!status.data?.enabled;
  const withBase = fields.filter((f) => values[f.key]?.trim());

  /** Translates the Chinese fields; `only` limits to one language and overwrites, otherwise fills empty fields in both. */
  async function autoTranslate(only?: "en" | "fr") {
    if (!kind || !withBase.length) return;
    const targets = only ? [only] : (["en", "fr"] as const);
    const jobs = withBase.filter((f) => only || targets.some((l) => !values[`${f.key}${suffix(l)}`]?.trim()));
    if (!jobs.length) {
      toast(t("a.tr.nothing"));
      return;
    }
    try {
      const res = await translate.mutateAsync({ texts: jobs.map((f) => values[f.key]!.trim()), kind });
      jobs.forEach((f, i) => {
        for (const l of targets) {
          const name = `${f.key}${suffix(l)}`;
          if (only || !values[name]?.trim()) onChange(name, res[l][i]);
        }
      });
      toast.success(t("a.tr.done"));
      if (!only) setTab("en");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  const complete = (lang: Lang) =>
    fields.every((f) => !values[f.key]?.trim() || !!values[`${f.key}${suffix(lang)}`]?.trim());
  // Jump back to Chinese if a required base field has an error.
  const baseError = fields.some((f) => errors[f.key]);
  const active = baseError ? "zh" : tab;

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label={t("a.tr.tabs")} className="grid grid-cols-3 gap-1 rounded-2xl bg-secondary p-1">
        {LANGS.map((lang) => {
          const selected = active === lang;
          const done = lang === "zh" ? !!values[fields[0].key]?.trim() : complete(lang);
          return (
            <button
              key={lang}
              type="button"
              role="tab"
              id={`${tabsId}-${lang}`}
              aria-selected={selected}
              aria-controls={`${tabsId}-panel`}
              onClick={() => setTab(lang)}
              className={cn(
                "press flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors",
                selected ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              <span lang={lang}>{LANG_LABEL[lang]}</span>
              {lang === "zh" && <span className="text-primary">*</span>}
              {done ? (
                <Check className="size-3.5 text-success" aria-label={t("a.tr.filled")} />
              ) : (
                lang !== "zh" && <span className="size-1.5 rounded-full bg-warning" aria-label={t("a.tr.missing")} />
              )}
            </button>
          );
        })}
      </div>

      {kind && withBase.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {canTranslate ? (
            active === "zh" ? (
              <Button type="button" variant="soft" size="sm" onClick={() => autoTranslate()} loading={translate.isPending} loadingText={t("a.tr.translating")}>
                <Sparkles /> {t("a.tr.auto")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => autoTranslate(active)}
                loading={translate.isPending}
                loadingText={t("a.tr.translating")}
              >
                <Languages /> {t("a.tr.retranslate")}
              </Button>
            )
          ) : (
            active !== "zh" &&
            status.data && <p className="text-xs text-muted-foreground">{t("a.tr.notConfigured")}</p>
          )}
          {canTranslate && <span className="text-[11px] text-muted-foreground">{t("a.tr.poweredBy")}</span>}
        </div>
      )}

      <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${active}`} className="space-y-4" lang={active}>
        {fields.map((f) => {
          const name = `${f.key}${suffix(active)}`;
          const id = `${idPrefix}-${name}`;
          const value = values[name] ?? "";
          const base = values[f.key]?.trim();
          const error = errors[name];
          const Control = f.multiline ? Textarea : Input;
          return (
            <div key={name} className="space-y-2">
              <Label htmlFor={id}>
                {f.label}
                {active === "zh" && f.required && <span className="ml-0.5 text-primary">*</span>}
                {active !== "zh" && <span className="ml-1.5 font-normal text-muted-foreground">· {LANG_LABEL[active]}</span>}
              </Label>
              <Control
                id={id}
                value={value}
                onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange(name, e.target.value)}
                placeholder={active === "zh" ? f.placeholder : base || f.placeholder}
                maxLength={f.maxLength}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
              />
              {error && (
                <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
              {active !== "zh" && !value.trim() && base && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{t("a.tr.fallback", { text: base })}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
