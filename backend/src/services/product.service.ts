import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { badRequest, notFound } from "../utils/http";
import { storage } from "../storage";
import { productListQuery, productSchema, productUpdateSchema } from "../validators/menu";
import { productInclude, serializeAllergen, serializeProduct } from "./serializers";

type ProductInput = z.infer<typeof productUpdateSchema>;

const adminInclude = { ...productInclude, category: true } satisfies Prisma.ProductInclude;

async function findOwned(restaurantId: number, id: number) {
  const product = await prisma.product.findFirst({ where: { id, restaurantId, deletedAt: null }, include: adminInclude });
  if (!product) throw notFound("product.notFound");
  return product;
}

async function assertCategory(restaurantId: number, categoryId: number) {
  const category = await prisma.category.findFirst({ where: { id: categoryId, restaurantId } });
  if (!category) throw badRequest("category.notFound");
}

/** Find-or-create ingredients by name for this restaurant, preserving input order and dropping duplicates. */
async function resolveIngredients(tx: Prisma.TransactionClient, restaurantId: number, names: string[]) {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const ids: number[] = [];
  for (const name of unique) {
    const ing = await tx.ingredient.upsert({
      where: { restaurantId_name: { restaurantId, name } },
      create: { restaurantId, name },
      update: {},
    });
    ids.push(ing.id);
  }
  return ids;
}

async function assertAllergens(ids: number[]) {
  const unique = [...new Set(ids)];
  const count = await prisma.allergen.count({ where: { id: { in: unique } } });
  if (count !== unique.length) throw badRequest("allergen.invalid");
  return unique;
}

/** Deletes a replaced/removed product image if no other product still uses it. */
async function releaseImage(url: string | null | undefined) {
  if (!storage.owns(url)) return;
  const stillUsed = await prisma.product.count({ where: { imageUrl: url, deletedAt: null } });
  if (stillUsed === 0) await storage.remove(url!);
}

function scalarData(input: ProductInput) {
  const data: Prisma.ProductUncheckedUpdateInput = {};
  for (const key of ["name", "nameEn", "nameFr", "description", "descriptionEn", "descriptionFr"] as const) {
    if (input[key] !== undefined) (data as Record<string, unknown>)[key] = input[key];
  }
  if (input.categoryId !== undefined) data.categoryId = input.categoryId;
  if (input.price !== undefined) data.price = input.price;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
  if (input.isAvailable !== undefined) data.isAvailable = input.isAvailable;
  if (input.isVegetarian !== undefined) data.isVegetarian = input.isVegetarian;
  if (input.isVegan !== undefined) data.isVegan = input.isVegan;
  if (input.isSpicy !== undefined) data.isSpicy = input.isSpicy;
  if (input.isGlutenFree !== undefined) data.isGlutenFree = input.isGlutenFree;
  // Vegan implies vegetarian.
  if (input.isVegan) data.isVegetarian = true;
  return data;
}

export async function listProducts(restaurantId: number, query: z.infer<typeof productListQuery>) {
  const products = await prisma.product.findMany({
    where: {
      restaurantId,
      deletedAt: null,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.q ? { name: { contains: query.q } } : {}),
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { id: "asc" }],
    include: adminInclude,
  });
  return products.map(serializeProduct);
}

export async function getProduct(restaurantId: number, id: number) {
  return serializeProduct(await findOwned(restaurantId, id));
}

export async function createProduct(restaurantId: number, input: z.infer<typeof productSchema>) {
  await assertCategory(restaurantId, input.categoryId);
  const allergenIds = await assertAllergens(input.allergenIds);
  const maxSort = await prisma.product.aggregate({ where: { restaurantId, categoryId: input.categoryId }, _max: { sortOrder: true } });

  const product = await prisma.$transaction(async (tx) => {
    const ingredientIds = await resolveIngredients(tx, restaurantId, input.ingredients);
    return tx.product.create({
      data: {
        ...(scalarData(input) as Prisma.ProductUncheckedCreateInput),
        restaurantId,
        currency: "EUR",
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        ingredients: { create: ingredientIds.map((ingredientId, sortOrder) => ({ ingredientId, sortOrder })) },
        allergens: { create: allergenIds.map((allergenId) => ({ allergenId })) },
      },
      include: adminInclude,
    });
  });
  return serializeProduct(product);
}

export async function updateProduct(restaurantId: number, id: number, input: ProductInput) {
  const existing = await findOwned(restaurantId, id);
  if (input.categoryId !== undefined) await assertCategory(restaurantId, input.categoryId);
  const allergenIds = input.allergenIds ? await assertAllergens(input.allergenIds) : undefined;

  const product = await prisma.$transaction(async (tx) => {
    if (input.ingredients) {
      const ingredientIds = await resolveIngredients(tx, restaurantId, input.ingredients);
      await tx.productIngredient.deleteMany({ where: { productId: id } });
      await tx.productIngredient.createMany({
        data: ingredientIds.map((ingredientId, sortOrder) => ({ productId: id, ingredientId, sortOrder })),
      });
    }
    if (allergenIds) {
      await tx.productAllergen.deleteMany({ where: { productId: id } });
      await tx.productAllergen.createMany({ data: allergenIds.map((allergenId) => ({ productId: id, allergenId })) });
    }
    return tx.product.update({ where: { id }, data: scalarData(input), include: adminInclude });
  });

  if (input.imageUrl !== undefined && input.imageUrl !== existing.imageUrl) await releaseImage(existing.imageUrl);
  return serializeProduct(product);
}

/** Soft delete so historical order items keep their product link. */
export async function deleteProduct(restaurantId: number, id: number) {
  const existing = await findOwned(restaurantId, id);
  await prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isAvailable: false } });
  await releaseImage(existing.imageUrl);
}

export async function listAllergens() {
  const allergens = await prisma.allergen.findMany({ orderBy: { sortOrder: "asc" } });
  return allergens.map(serializeAllergen);
}
