import { z } from "zod";

// Messages are i18n keys ("v.*"); the error middleware translates them. "v.tooLong|N" carries the limit.

// Strip ASCII control characters (keeps \n and \t) and trim.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();

export const text = (max: number) => z.string().max(max * 2).transform(clean).pipe(z.string().max(max, `v.tooLong|${max}`));
export const requiredText = (max: number) =>
  z.string({ required_error: "v.required", invalid_type_error: "v.required" })
    .transform(clean)
    .pipe(z.string().min(1, "v.required").max(max, `v.tooLong|${max}`));
/** Optional text where "" becomes null. */
export const optionalText = (max: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v == null ? v : clean(v) || null))
    .pipe(z.string().max(max, `v.tooLong|${max}`).nullable().optional());

export const price = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim().replace(",", "."))
  .pipe(z.string().regex(/^\d{1,8}(\.\d{1,2})?$/, "v.price"))
  .refine((v) => Number(v) > 0, "v.pricePositive");

export const id = z.coerce.number().int().positive();

/** Image URLs must point at our own uploads (or be cleared). Blocks javascript:/data: URLs. */
export const imageUrl = z.union([z.string().regex(/^\/uploads\/(products|restaurant)\/[\w.-]+$/, "v.imageUrl"), z.null()]).optional();

/** Base (Chinese) text is required; EN/FR translations are optional. */
export const translatedName = (max: number) => ({
  name: requiredText(max),
  nameEn: optionalText(max),
  nameFr: optionalText(max),
});
export const translatedDescription = (max: number) => ({
  description: optionalText(max),
  descriptionEn: optionalText(max),
  descriptionFr: optionalText(max),
});
