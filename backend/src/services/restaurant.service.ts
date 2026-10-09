import { z } from "zod";
import { prisma } from "../utils/prisma";
import { notFound } from "../utils/http";
import { storage } from "../storage";
import { restaurantUpdateSchema } from "../validators/menu";
import { storeImage } from "./image.service";
import { serializeRestaurant } from "./serializers";

async function find(restaurantId: number) {
  const r = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!r) throw notFound("restaurant.notFound");
  return r;
}

export async function getRestaurant(restaurantId: number) {
  return serializeRestaurant(await find(restaurantId));
}

export async function updateRestaurant(restaurantId: number, input: z.infer<typeof restaurantUpdateSchema>) {
  return serializeRestaurant(await prisma.restaurant.update({ where: { id: restaurantId }, data: input }));
}

export async function setLogo(restaurantId: number, file: Buffer | undefined) {
  const previous = (await find(restaurantId)).logoUrl;
  const logoUrl = await storeImage("restaurant", file);
  const updated = await prisma.restaurant.update({ where: { id: restaurantId }, data: { logoUrl } });
  if (previous) await storage.remove(previous);
  return serializeRestaurant(updated);
}

export async function removeLogo(restaurantId: number) {
  const previous = (await find(restaurantId)).logoUrl;
  const updated = await prisma.restaurant.update({ where: { id: restaurantId }, data: { logoUrl: null } });
  if (previous) await storage.remove(previous);
  return serializeRestaurant(updated);
}
