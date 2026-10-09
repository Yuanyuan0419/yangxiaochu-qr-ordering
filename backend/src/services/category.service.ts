import { z } from "zod";
import { prisma } from "../utils/prisma";
import { badRequest, conflict, notFound } from "../utils/http";
import { categorySchema, categoryUpdateSchema } from "../validators/menu";
import { serializeCategory } from "./serializers";

async function findOwned(restaurantId: number, id: number) {
  const category = await prisma.category.findFirst({ where: { id, restaurantId } });
  if (!category) throw notFound("category.notFound");
  return category;
}

export async function listCategories(restaurantId: number) {
  const categories = await prisma.category.findMany({
    where: { restaurantId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { _count: { select: { products: { where: { deletedAt: null } } } } },
  });
  return categories.map((c) => ({ ...serializeCategory(c), productCount: c._count.products }));
}

export async function createCategory(restaurantId: number, input: z.infer<typeof categorySchema>) {
  const max = await prisma.category.aggregate({ where: { restaurantId }, _max: { sortOrder: true } });
  const category = await prisma.category.create({
    data: { ...input, restaurantId, sortOrder: (max._max.sortOrder ?? -1) + 1 },
  });
  return { ...serializeCategory(category), productCount: 0 };
}

export async function updateCategory(restaurantId: number, id: number, input: z.infer<typeof categoryUpdateSchema>) {
  await findOwned(restaurantId, id);
  return serializeCategory(await prisma.category.update({ where: { id }, data: input }));
}

export async function deleteCategory(restaurantId: number, id: number) {
  await findOwned(restaurantId, id);
  const live = await prisma.product.count({ where: { categoryId: id, deletedAt: null } });
  if (live > 0) throw conflict("category.notEmpty");
  await prisma.$transaction([
    // Soft-deleted products still reference the category; their order history keeps name/price snapshots.
    prisma.product.deleteMany({ where: { categoryId: id, deletedAt: { not: null } } }),
    prisma.category.delete({ where: { id } }),
  ]);
}

export async function reorderCategories(restaurantId: number, ids: number[]) {
  const owned = await prisma.category.findMany({ where: { restaurantId }, select: { id: true } });
  const ownedIds = new Set(owned.map((c) => c.id));
  if (ids.length !== ownedIds.size || ids.some((id) => !ownedIds.has(id))) throw badRequest("category.changed");
  await prisma.$transaction(ids.map((id, sortOrder) => prisma.category.update({ where: { id }, data: { sortOrder } })));
  return listCategories(restaurantId);
}
