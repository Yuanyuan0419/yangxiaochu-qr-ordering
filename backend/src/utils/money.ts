import { Prisma } from "@prisma/client";

export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;

/** Serialises a DECIMAL(10,2) to a fixed 2-decimal string ("12.50") for the API. */
export const money = (value: Prisma.Decimal | number | string) => new Prisma.Decimal(value).toFixed(2);
