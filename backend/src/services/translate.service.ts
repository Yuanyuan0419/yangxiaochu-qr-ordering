import { env } from "../config/env";
import { HttpError } from "../utils/http";

export type TargetLang = "en" | "fr";

/** What the text is; passed to DeepL as context (not translated, not billed) so short menu words translate well. */
export const CONTEXTS = {
  dish: "Name and description of a dish on the menu of a Chinese (Sichuan) restaurant in Europe. Use the natural dish name diners would expect; translate culinary terms accurately.",
  category: "A section heading on the menu of a Chinese restaurant, e.g. cold dishes, hot dishes, soups, drinks.",
  ingredient: "A single cooking ingredient listed under a dish on a Chinese restaurant menu.",
  restaurant: "Short introduction of a Chinese restaurant shown to diners on its menu.",
  hours: "Opening hours of a restaurant.",
} as const;
export type TranslateKind = keyof typeof CONTEXTS;

const TARGET: Record<TargetLang, string> = { en: "EN-GB", fr: "FR" };

export const translationEnabled = () => !!env.DEEPL_API_KEY;

/**
 * Translates Chinese texts with DeepL. Free-plan keys (suffix ":fx") use the free endpoint.
 * Empty strings are passed through without spending quota.
 */
export async function translate(texts: string[], target: TargetLang, kind: TranslateKind): Promise<string[]> {
  const key = env.DEEPL_API_KEY;
  if (!key) throw new HttpError(503, "translate.notConfigured", "TRANSLATE_DISABLED");

  const indexes = texts.map((t, i) => (t.trim() ? i : -1)).filter((i) => i >= 0);
  const out = texts.map(() => "");
  if (!indexes.length) return out;

  const host = key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  let res: Response;
  try {
    res = await fetch(`${host}/v2/translate`, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: indexes.map((i) => texts[i]),
        source_lang: "ZH",
        target_lang: TARGET[target],
        context: CONTEXTS[kind],
        preserve_formatting: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new HttpError(502, "translate.failed", "TRANSLATE_FAILED");
  }

  if (res.status === 456) throw new HttpError(429, "translate.quota", "TRANSLATE_QUOTA");
  if (res.status === 403) throw new HttpError(502, "translate.badKey", "TRANSLATE_KEY");
  if (!res.ok) throw new HttpError(502, "translate.failed", "TRANSLATE_FAILED");

  const data = (await res.json()) as { translations: { text: string }[] };
  indexes.forEach((i, n) => (out[i] = data.translations[n]?.text?.trim() ?? ""));
  return out;
}

/** Translates into both languages at once. */
export async function translateBoth(texts: string[], kind: TranslateKind) {
  const [en, fr] = await Promise.all([translate(texts, "en", kind), translate(texts, "fr", kind)]);
  return { en, fr };
}
