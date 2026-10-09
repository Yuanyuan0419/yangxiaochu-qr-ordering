/**
 * Fills in missing EN/FR translations for the demo menu WITHOUT touching anything else.
 * Matches by the Chinese name; only writes fields that are currently empty, so owner edits are preserved.
 * Safe to run repeatedly:  npm run db:translate
 */
import { PrismaClient } from "@prisma/client";
import { INGREDIENT_I18N, MENU } from "./seed-data";

const prisma = new PrismaClient();

const fill = <T extends Record<string, unknown>>(current: T, next: Partial<T>) =>
  Object.fromEntries(Object.entries(next).filter(([k, v]) => v && !current[k]));

async function main() {
  let updated = 0;
  const restaurant = await prisma.restaurant.findUnique({ where: { slug: "yangxiaochu" } });
  if (restaurant) {
    const data = fill(restaurant, {
      nameEn: "Yang's Kitchen",
      nameFr: "La Cuisine de Yang",
      descriptionEn: restaurant.description === "家常川味，现点现炒。" ? "Home-style Sichuan cooking, made to order." : undefined,
      descriptionFr: restaurant.description === "家常川味，现点现炒。" ? "Cuisine familiale du Sichuan, préparée à la minute." : undefined,
      openingHoursEn: restaurant.openingHours?.startsWith("周二至周日 11:30") ? "Tue–Sun 11:30–14:30, 17:30–22:00\nClosed on Mondays" : undefined,
      openingHoursFr: restaurant.openingHours?.startsWith("周二至周日 11:30") ? "Du mardi au dimanche 11h30–14h30, 17h30–22h00\nFermé le lundi" : undefined,
    });
    if (Object.keys(data).length) {
      await prisma.restaurant.update({ where: { id: restaurant.id }, data });
      updated++;
    }
  }

  for (const group of MENU) {
    const categories = await prisma.category.findMany({ where: { name: group.category } });
    for (const c of categories) {
      const data = fill(c, { nameEn: group.en[0], nameFr: group.fr[0], descriptionEn: group.en[1], descriptionFr: group.fr[1] });
      if (Object.keys(data).length) {
        await prisma.category.update({ where: { id: c.id }, data });
        updated++;
      }
    }
    for (const p of group.products) {
      const products = await prisma.product.findMany({ where: { name: p.name } });
      for (const row of products) {
        // Only translate the description if the owner hasn't rewritten the Chinese text.
        const sameDescription = row.description === p.description;
        const data = fill(row, {
          nameEn: p.en[0],
          nameFr: p.fr[0],
          descriptionEn: sameDescription ? p.en[1] : undefined,
          descriptionFr: sameDescription ? p.fr[1] : undefined,
        });
        if (Object.keys(data).length) {
          await prisma.product.update({ where: { id: row.id }, data });
          updated++;
        }
      }
    }
  }

  for (const [name, [nameEn, nameFr]] of Object.entries(INGREDIENT_I18N)) {
    const rows = await prisma.ingredient.findMany({ where: { name } });
    for (const row of rows) {
      const data = fill(row, { nameEn, nameFr });
      if (Object.keys(data).length) {
        await prisma.ingredient.update({ where: { id: row.id }, data });
        updated++;
      }
    }
  }
  console.log(`Filled translations on ${updated} records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
