import { prisma } from "../utils/prisma";
import { translate, type TargetLang, type TranslateKind } from "./translate.service";

type Model = "restaurant" | "category" | "product" | "ingredient";

interface Job {
  model: Model;
  id: number;
  /** Target column, e.g. "nameFr". */
  field: string;
  kind: TranslateKind;
  lang: TargetLang;
  text: string;
}

const DEEPL_BATCH = 50;

/** Queues a job for each language whose translation column is empty. */
function queue(jobs: Job[], model: Model, row: Record<string, unknown> & { id: number }, base: string, kind: TranslateKind) {
  const text = (row[base] as string | null)?.trim();
  if (!text) return;
  for (const [lang, suffix] of [["en", "En"], ["fr", "Fr"]] as const) {
    const field = `${base}${suffix}`;
    if (!(row[field] as string | null)?.trim()) jobs.push({ model, id: row.id, field, kind, lang, text });
  }
}

async function run(jobs: Job[]) {
  // Group by (kind, lang) so each DeepL call shares one context and target.
  const groups = new Map<string, Job[]>();
  for (const j of jobs) {
    const key = `${j.kind}|${j.lang}`;
    groups.set(key, [...(groups.get(key) ?? []), j]);
  }

  const results: { job: Job; value: string }[] = [];
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += DEEPL_BATCH) {
      const chunk = group.slice(i, i + DEEPL_BATCH);
      const translated = await translate(
        chunk.map((j) => j.text),
        chunk[0].lang,
        chunk[0].kind,
      );
      chunk.forEach((job, n) => translated[n] && results.push({ job, value: translated[n] }));
    }
  }

  // Merge per row, then write.
  const updates = new Map<string, { model: Model; id: number; data: Record<string, string> }>();
  for (const { job, value } of results) {
    const key = `${job.model}|${job.id}`;
    const u = updates.get(key) ?? { model: job.model, id: job.id, data: {} };
    u.data[job.field] = value;
    updates.set(key, u);
  }
  for (const u of updates.values()) {
    if (u.model === "restaurant") await prisma.restaurant.update({ where: { id: u.id }, data: u.data });
    if (u.model === "category") await prisma.category.update({ where: { id: u.id }, data: u.data });
    if (u.model === "product") await prisma.product.update({ where: { id: u.id }, data: u.data });
    if (u.model === "ingredient") await prisma.ingredient.update({ where: { id: u.id }, data: u.data });
  }
  return { fields: results.length, records: updates.size };
}

/**
 * Fills every EMPTY English/French field of the menu (restaurant intro & hours, categories, dishes) from Chinese.
 * Never overwrites existing translations. The restaurant name is a brand and is left alone.
 */
export async function autoTranslateMenu(restaurantId: number) {
  const jobs: Job[] = [];
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
  queue(jobs, "restaurant", restaurant, "description", "restaurant");
  queue(jobs, "restaurant", restaurant, "openingHours", "hours");

  for (const c of await prisma.category.findMany({ where: { restaurantId } })) {
    queue(jobs, "category", c, "name", "category");
    queue(jobs, "category", c, "description", "category");
  }
  for (const p of await prisma.product.findMany({ where: { restaurantId, deletedAt: null } })) {
    queue(jobs, "product", p, "name", "dish");
    queue(jobs, "product", p, "description", "dish");
  }
  for (const i of await prisma.ingredient.findMany({ where: { restaurantId } })) {
    queue(jobs, "ingredient", i, "name", "ingredient");
  }
  return run(jobs);
}

export async function countMissingTranslations(restaurantId: number) {
  const jobs: Job[] = [];
  for (const c of await prisma.category.findMany({ where: { restaurantId } })) {
    queue(jobs, "category", c, "name", "category");
    queue(jobs, "category", c, "description", "category");
  }
  for (const p of await prisma.product.findMany({ where: { restaurantId, deletedAt: null } })) {
    queue(jobs, "product", p, "name", "dish");
    queue(jobs, "product", p, "description", "dish");
  }
  for (const i of await prisma.ingredient.findMany({ where: { restaurantId } })) {
    queue(jobs, "ingredient", i, "name", "ingredient");
  }
  return jobs.length;
}
