import { Router } from "express";
import * as c from "../controllers/public.controller";
import { orderLimiter } from "../middlewares/rateLimit";

export const publicRouter = Router();

publicRouter.get("/restaurants/:slug", c.getRestaurant);
publicRouter.get("/tables/:qrToken", c.getTable);
publicRouter.get("/menu/:restaurantSlug/:qrToken", c.getMenu);
publicRouter.get("/bill/:restaurantSlug/:qrToken", c.getTableBill);
publicRouter.get("/products/:id", c.getProduct);
publicRouter.post("/orders", orderLimiter, c.createOrder);
publicRouter.get("/orders/:publicId", c.getOrder);
