import { z } from "zod";
import { langOf } from "../i18n";
import { asyncHandler, parseId } from "../utils/http";
import * as publicService from "../services/public.service";
import * as orderService from "../services/order.service";
import { createOrderSchema } from "../validators/order";

const slug = z.string().trim().min(1).max(64);
const token = z.string().trim().min(1).max(32);

export const getRestaurant = asyncHandler(async (req, res) => {
  res.json(await publicService.getRestaurantBySlug(slug.parse(req.params.slug)));
});

export const getTable = asyncHandler(async (req, res) => {
  res.json(await publicService.getTable(token.parse(req.params.qrToken)));
});

export const getMenu = asyncHandler(async (req, res) => {
  res.json(await publicService.getMenu(slug.parse(req.params.restaurantSlug), token.parse(req.params.qrToken)));
});

export const getTableBill = asyncHandler(async (req, res) => {
  res.json(await publicService.getTableBill(slug.parse(req.params.restaurantSlug), token.parse(req.params.qrToken)));
});

export const getProduct = asyncHandler(async (req, res) => {
  res.json(await publicService.getPublicProduct(parseId(req.params.id)));
});

export const createOrder = asyncHandler(async (req, res) => {
  res.status(201).json(await orderService.createOrder(createOrderSchema.parse(req.body), langOf(req)));
});

export const getOrder = asyncHandler(async (req, res) => {
  res.json(await orderService.getPublicOrder(token.parse(req.params.publicId)));
});
