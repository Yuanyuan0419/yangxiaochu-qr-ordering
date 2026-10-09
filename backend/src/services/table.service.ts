import { z } from "zod";
import { prisma } from "../utils/prisma";
import { conflict, notFound } from "../utils/http";
import { newQrToken } from "../utils/tokens";
import { tableSchema, tableUpdateSchema } from "../validators/menu";
import { serializeTable } from "./serializers";

async function findOwned(restaurantId: number, id: number) {
  const table = await prisma.table.findFirst({ where: { id, restaurantId } });
  if (!table) throw notFound("table.notFound");
  return table;
}

/** Natural sort so "Table 10" comes after "Table 9". */
const collator = new Intl.Collator("zh-CN", { numeric: true });

export async function listTables(restaurantId: number) {
  const tables = await prisma.table.findMany({ where: { restaurantId } });
  return tables.sort((a, b) => collator.compare(a.tableNumber, b.tableNumber)).map(serializeTable);
}

export async function getTable(restaurantId: number, id: number) {
  return serializeTable(await findOwned(restaurantId, id));
}

export async function createTable(restaurantId: number, input: z.infer<typeof tableSchema>) {
  return serializeTable(await prisma.table.create({ data: { ...input, restaurantId, qrToken: newQrToken() } }));
}

export async function updateTable(restaurantId: number, id: number, input: z.infer<typeof tableUpdateSchema>) {
  await findOwned(restaurantId, id);
  return serializeTable(await prisma.table.update({ where: { id }, data: input }));
}

/** Orders keep tableNumberSnapshot; their tableId becomes NULL. */
export async function deleteTable(restaurantId: number, id: number) {
  await findOwned(restaurantId, id);
  const open = await prisma.tableSession.count({ where: { tableId: id, status: "OPEN" } });
  if (open) throw conflict("table.hasOpenBill");
  await prisma.table.delete({ where: { id } });
}

/** Issues a new token; previously printed QR codes for this table stop working immediately. */
export async function regenerateQr(restaurantId: number, id: number) {
  await findOwned(restaurantId, id);
  return serializeTable(await prisma.table.update({ where: { id }, data: { qrToken: newQrToken() } }));
}
