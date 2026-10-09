import { z } from "zod";
import { id, imageUrl, optionalText, price, requiredText, text, translatedDescription, translatedName } from "./common";

export const productSchema = z.object({
  ...translatedName(120),
  ...translatedDescription(2000),
  categoryId: id,
  price,
  imageUrl,
  isAvailable: z.boolean().default(true),
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  ingredients: z.array(text(80)).max(40).default([]),
  allergenIds: z.array(id).max(14).default([]),
});
export const productUpdateSchema = productSchema.partial();

export const productListQuery = z.object({
  q: z.string().trim().max(120).optional(),
  categoryId: id.optional(),
});

export const categorySchema = z.object({
  ...translatedName(80),
  ...translatedDescription(255),
  isActive: z.boolean().default(true),
});
export const categoryUpdateSchema = categorySchema.partial().extend({ sortOrder: z.number().int().min(0).optional() });
export const categoryReorderSchema = z.object({ ids: z.array(id).min(1).max(200) });

export const ingredientUpdateSchema = z.object(translatedName(80)).partial();

export const tableSchema = z.object({
  tableNumber: requiredText(20),
  isActive: z.boolean().default(true),
});
export const tableUpdateSchema = tableSchema.partial();

export const restaurantUpdateSchema = z
  .object({
    ...translatedName(120),
    ...translatedDescription(1000),
    address: optionalText(255),
    phone: optionalText(50),
    openingHours: optionalText(1000),
    openingHoursEn: optionalText(1000),
    openingHoursFr: optionalText(1000),
    autoAcceptOrders: z.boolean(),
  })
  .partial();

export const translateSchema = z.object({
  texts: z.array(z.string().max(2000, "v.tooLong|2000")).min(1).max(20),
  kind: z.enum(["dish", "category", "ingredient", "restaurant", "hours"]),
});
