/**
 * Development seed for 杨小厨.
 * WARNING: wipes all data in the configured database before inserting.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { newQrToken } from "../backend/src/utils/tokens";
import { ALLERGENS, INGREDIENT_I18N, MENU } from "./seed-data";

const prisma = new PrismaClient();

const ROOT = path.resolve(__dirname, "..");
const SEED_IMAGES = path.join(__dirname, "seed-images");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT, "uploads");

function copySeedImage(name: string): string | null {
  const src = path.join(SEED_IMAGES, `${name}.jpg`);
  if (!existsSync(src)) return null;
  const destDir = path.join(UPLOAD_DIR, "products");
  mkdirSync(destDir, { recursive: true });
  copyFileSync(src, path.join(destDir, `seed-${name}.jpg`));
  return `/uploads/products/seed-${name}.jpg`;
}

async function main() {
  console.log("Clearing existing data…");
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.tableSession.deleteMany();
  await prisma.productAllergen.deleteMany();
  await prisma.productIngredient.deleteMany();
  await prisma.product.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.category.deleteMany();
  await prisma.table.deleteMany();
  await prisma.restaurantUser.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();
  await prisma.allergen.deleteMany();

  console.log("Seeding allergens…");
  await prisma.allergen.createMany({
    data: ALLERGENS.map(([code, name, nameEn, nameFr], i) => ({ code, name, nameEn, nameFr, sortOrder: i })),
  });
  const allergenIds = new Map((await prisma.allergen.findMany()).map((a) => [a.code, a.id]));

  console.log("Seeding restaurant & owner…");
  const restaurant = await prisma.restaurant.create({
    data: {
      slug: "yangxiaochu",
      name: "杨小厨",
      nameEn: "Yang's Kitchen",
      nameFr: "La Cuisine de Yang",
      description: "家常川味，现点现炒。",
      descriptionEn: "Home-style Sichuan cooking, made to order.",
      descriptionFr: "Cuisine familiale du Sichuan, préparée à la minute.",
      currency: "EUR",
      defaultLanguage: "zh-CN",
      openingHours: "周二至周日 11:30–14:30, 17:30–22:00\n周一休息",
      openingHoursEn: "Tue–Sun 11:30–14:30, 17:30–22:00\nClosed on Mondays",
      openingHoursFr: "Du mardi au dimanche 11h30–14h30, 17h30–22h00\nFermé le lundi",
    },
  });
  const owner = await prisma.user.create({
    data: {
      email: "admin@example.com",
      passwordHash: await bcrypt.hash("Admin123!", 12),
      displayName: "张三",
      role: "OWNER",
    },
  });
  await prisma.restaurantUser.create({ data: { restaurantId: restaurant.id, userId: owner.id, role: "OWNER" } });

  console.log("Seeding tables…");
  for (let n = 1; n <= 5; n++) {
    await prisma.table.create({ data: { restaurantId: restaurant.id, tableNumber: String(n), qrToken: newQrToken() } });
  }

  console.log("Seeding menu…");
  const ingredientIds = new Map<string, number>();
  for (const [ci, group] of MENU.entries()) {
    const category = await prisma.category.create({
      data: {
        restaurantId: restaurant.id,
        name: group.category,
        nameEn: group.en[0],
        nameFr: group.fr[0],
        description: group.description,
        descriptionEn: group.en[1],
        descriptionFr: group.fr[1],
        sortOrder: ci,
      },
    });
    for (const [pi, p] of group.products.entries()) {
      for (const name of p.ingredients) {
        if (!ingredientIds.has(name)) {
          const [nameEn, nameFr] = INGREDIENT_I18N[name] ?? [];
          const ing = await prisma.ingredient.create({ data: { restaurantId: restaurant.id, name, nameEn, nameFr } });
          ingredientIds.set(name, ing.id);
        }
      }
      const tags = new Set(p.tags ?? []);
      await prisma.product.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          name: p.name,
          nameEn: p.en[0],
          nameFr: p.fr[0],
          description: p.description,
          descriptionEn: p.en[1],
          descriptionFr: p.fr[1],
          price: p.price,
          currency: "EUR",
          imageUrl: copySeedImage(p.image),
          isAvailable: p.available ?? true,
          isVegetarian: tags.has("veg"),
          isVegan: tags.has("vegan"),
          isSpicy: tags.has("spicy"),
          isGlutenFree: tags.has("gf"),
          sortOrder: pi,
          ingredients: {
            create: p.ingredients.map((name, i) => ({ ingredientId: ingredientIds.get(name)!, sortOrder: i })),
          },
          allergens: { create: p.allergens.map((code) => ({ allergenId: allergenIds.get(code)! })) },
        },
      });
    }
  }

  const tables = await prisma.table.findMany({ where: { restaurantId: restaurant.id }, orderBy: { id: "asc" } });
  console.log("\nDone. Owner login: admin@example.com / Admin123!");
  console.log("Customer menu links:");
  for (const t of tables) console.log(`  Table ${t.tableNumber}: /menu/${restaurant.slug}/${t.qrToken}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
