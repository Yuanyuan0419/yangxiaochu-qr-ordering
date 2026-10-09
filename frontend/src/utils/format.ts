import { getLang, LOCALE, translate, type Lang } from "@/i18n";
import type { OrderStatus } from "@/types";

const formatters = new Map<string, Intl.NumberFormat>();

/** Locale-aware money: "€12.50" (zh/en) or "12,50 €" (fr). Reads the current UI language. */
export function formatPrice(amount: string | number, currency = "EUR", lang: Lang = getLang()) {
  const key = `${lang}|${currency}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(lang === "zh" ? "en-IE" : LOCALE[lang], { style: "currency", currency, minimumFractionDigits: 2 });
    formatters.set(key, f);
  }
  return f.format(Number(amount));
}

/** Cent-exact arithmetic for cart display (the server recalculates authoritative totals). */
export const toCents = (amount: string) => Math.round(Number(amount) * 100);
export const fromCents = (cents: number) => (cents / 100).toFixed(2);

export const formatTime = (iso: string, lang: Lang = getLang()) =>
  new Date(iso).toLocaleTimeString(LOCALE[lang], { hour: "2-digit", minute: "2-digit", hour12: false });

export function formatDateTime(iso: string, lang: Lang = getLang()) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? `${translate(lang, "common.today")} ${formatTime(iso, lang)}`
    : d.toLocaleString(LOCALE[lang], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatDate(d: Date, lang: Lang = getLang()) {
  return d.toLocaleDateString(LOCALE[lang], { weekday: "short", year: "numeric", month: "long", day: "numeric" });
}

/** "YYYY-MM-DD" in local time. */
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function timeAgo(iso: string, lang: Lang = getLang(), now = Date.now()) {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return translate(lang, "common.justNow");
  if (mins < 60) return translate(lang, "common.minutesAgo", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return translate(lang, "common.hoursAgo", { n: hours });
  return translate(lang, "common.daysAgo", { n: Math.floor(hours / 24) });
}

export function duration(fromIso: string, lang: Lang = getLang(), now = Date.now()) {
  const mins = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 60000));
  if (mins < 60) return translate(lang, "common.duration.min", { n: mins });
  return translate(lang, "common.duration.hour", { h: Math.floor(mins / 60), m: mins % 60 });
}

export function greetingKey(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return "a.greeting.night" as const;
  if (h < 11) return "a.greeting.morning" as const;
  if (h < 13) return "a.greeting.noon" as const;
  if (h < 18) return "a.greeting.afternoon" as const;
  return "a.greeting.evening" as const;
}

export const statusKey = (s: OrderStatus) => `status.${s}` as const;

/** Orders still in the kitchen can be cancelled; once a dish is served they can't. */
export const CANCELLABLE: OrderStatus[] = ["PENDING", "PREPARING"];
export const KITCHEN: OrderStatus[] = ["PENDING", "PREPARING", "SERVING"];
