import { useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { en } from "./en";
import { fr } from "./fr";
import { zh, type Key } from "./zh";

export type Lang = "zh" | "en" | "fr";
export const LANGS: Lang[] = ["zh", "en", "fr"];
export const LANG_LABEL: Record<Lang, string> = { zh: "中文", en: "English", fr: "Français" };
/** BCP-47 locale for Intl formatting. */
export const LOCALE: Record<Lang, string> = { zh: "zh-CN", en: "en-IE", fr: "fr-FR" };

export type Params = Record<string, string | number>;
/** Every language must translate every key; "#one" variants are optional singular forms. */
export type Dict = Record<Key, string> & Partial<Record<`${Key}#one`, string>>;

const DICTS: Record<Lang, Dict> = { zh, en, fr };

function detect(): Lang {
  const nav = typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "zh";
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("zh")) return "zh";
  return "en";
}

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: detect(),
      setLang: (lang) => {
        document.documentElement.lang = LOCALE[lang];
        set({ lang });
      },
    }),
    {
      name: "yxc-lang",
      onRehydrateStorage: () => (state) => {
        if (state) document.documentElement.lang = LOCALE[state.lang];
      },
    },
  ),
);

export const getLang = () => useLangStore.getState().lang;

const plural = new Map<Lang, Intl.PluralRules>();

/** Translates a key in the given language. Uses the "#one" form when the count is singular. */
export function translate(lang: Lang, key: Key, params: Params = {}): string {
  const dict = DICTS[lang];
  let template: string = dict[key] ?? zh[key];
  if (typeof params.count === "number") {
    let rules = plural.get(lang);
    if (!rules) plural.set(lang, (rules = new Intl.PluralRules(LOCALE[lang])));
    if (rules.select(params.count) === "one") template = dict[`${key}#one` as const] ?? template;
  }
  return template.replace(/\{(\w+)\}/g, (_, name) => (params[name] !== undefined ? String(params[name]) : `{${name}}`));
}

export function useT() {
  const lang = useLangStore((s) => s.lang);
  const t = useCallback((key: Key, params?: Params) => translate(lang, key, params), [lang]);
  return { t, lang };
}

/**
 * Picks the translated value of a content field (e.g. product name) for the current language,
 * falling back to the base (Chinese) field when the translation is empty.
 */
export function localized(obj: object, field: string, lang: Lang): string {
  const rec = obj as Record<string, unknown>;
  const base = (rec[field] as string | null | undefined) ?? "";
  if (lang === "zh") return base;
  const suffix = lang === "en" ? "En" : "Fr";
  const translated = rec[`${field}${suffix}`] as string | null | undefined;
  return translated?.trim() ? translated : base;
}

/** Hook form of `localized` bound to the current language. */
export function useLocalized() {
  const lang = useLangStore((s) => s.lang);
  return useCallback((obj: object, field = "name") => localized(obj, field, lang), [lang]);
}

export type { Key };
