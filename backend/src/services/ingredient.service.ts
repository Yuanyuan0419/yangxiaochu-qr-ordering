import { z } from "zod";
import { prisma } from "../utils/prisma";
import { conflict, notFound } from "../utils/http";
import { ingredientUpdateSchema } from "../validators/menu";
import { serializeIngredient } from "./serializers";

/** Ingredient library with usage counts, for translating ingredient names. */
export async function listIngredients(restaurantId: number) {
  const ingredients = await prisma.ingredient.findMany({
    where: { restaurantId },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { product: { deletedAt: null } } } } } },
  });
  return ingredients.map((i) => ({ ...serializeIngredient(i), productCount: i._count.products }));
}

async function findOwned(restaurantId: number, id: number) {
  const ingredient = await prisma.ingredient.findFirst({ where: { id, restaurantId } });
  if (!ingredient) throw notFound("ingredient.notFound");
  return ingredient;
}

export async function updateIngredient(restaurantId: number, id: number, input: z.infer<typeof ingredientUpdateSchema>) {
  await findOwned(restaurantId, id);
  return serializeIngredient(await prisma.ingredient.update({ where: { id }, data: input }));
}

export async function deleteIngredient(restaurantId: number, id: number) {
  await findOwned(restaurantId, id);
  const count = await prisma.productIngredient.count({ where: { ingredientId: id, product: { deletedAt: null } } });
  if (count) throw conflict("ingredient.inUse", { count });
  await prisma.ingredient.delete({ where: { id } });
}
