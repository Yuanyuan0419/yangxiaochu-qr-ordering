import { z } from "zod";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import { id, optionalText } from "./common";

export const createOrderSchema = z.object({
  restaurantSlug: z.string().trim().min(1).max(64),
  qrToken: z.string().trim().min(4).max(32),
  items: z
    .array(z.object({ productId: id, quantity: z.coerce.number().int().min(1).max(50) }))
    .min(1, "v.emptyCart")
    .max(50),
  note: optionalText(500),
});

/** Only the manual transitions; SERVING/SERVED follow from item ticks and COMPLETED from checkout. */
export const orderStatusSchema = z.object({ status: z.enum([OrderStatus.PREPARING, OrderStatus.CANCELLED]) });
export const bulkAcceptSchema = z.object({ ids: z.array(id).min(1).max(100) });
export const itemServedSchema = z.object({ served: z.boolean() });

export const orderListQuery = z.object({
  status: z.union([z.nativeEnum(OrderStatus), z.enum(["ACTIVE", "KITCHEN", "ALL"])]).default("ALL"),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const closeSessionSchema = z.object({ paymentMethod: z.nativeEnum(PaymentMethod) });
export const clearSessionSchema = z.object({ password: z.string().min(1, "v.required").max(200), note: optionalText(255) });
export const splitSessionSchema = z.object({ paymentMethod: z.nativeEnum(PaymentMethod), moveOrderIds: z.array(id).min(1).max(50) });

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "v.invalid");
export const sessionListQuery = z.object({ from: date.optional(), to: date.optional() });
