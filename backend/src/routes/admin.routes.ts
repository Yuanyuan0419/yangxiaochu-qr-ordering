import { Router } from "express";
import * as c from "../controllers/admin.controller";
import * as authC from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth";
import { imageUpload } from "../middlewares/upload";
import { passwordActionLimiter, translateLimiter } from "../middlewares/rateLimit";

export const adminRouter = Router();

// Every admin route is authenticated and scoped to the caller's restaurant.
adminRouter.use(requireAuth);

adminRouter.get("/dashboard", c.dashboard);

adminRouter.get("/orders", c.listOrders);
adminRouter.post("/orders/accept", c.acceptOrders);
adminRouter.get("/orders/:id", c.getOrder);
adminRouter.patch("/orders/:id/status", c.updateOrderStatus);
adminRouter.patch("/orders/:id/items/:itemId", c.setItemServed);
adminRouter.post("/orders/:id/serve-all", c.serveAll);
adminRouter.post("/orders/:id/same-guests", c.confirmSameGuests);

adminRouter.get("/bills", c.listSessions);
adminRouter.get("/bills/:id", c.getSession);
adminRouter.post("/bills/:id/close", c.closeSession);
adminRouter.post("/bills/:id/split", c.splitSession);
adminRouter.post("/bills/:id/clear", passwordActionLimiter, c.clearSession);

adminRouter.get("/products", c.listProducts);
adminRouter.post("/products", c.createProduct);
adminRouter.get("/products/:id", c.getProduct);
adminRouter.patch("/products/:id", c.updateProduct);
adminRouter.delete("/products/:id", c.deleteProduct);
adminRouter.post("/uploads/product-image", imageUpload, c.uploadProductImage);
adminRouter.get("/allergens", c.listAllergens);
adminRouter.get("/ingredients", c.listIngredients);
adminRouter.patch("/ingredients/:id", c.updateIngredient);
adminRouter.delete("/ingredients/:id", c.deleteIngredient);

adminRouter.get("/categories", c.listCategories);
adminRouter.post("/categories", c.createCategory);
adminRouter.patch("/categories/reorder", c.reorderCategories);
adminRouter.patch("/categories/:id", c.updateCategory);
adminRouter.delete("/categories/:id", c.deleteCategory);

adminRouter.get("/tables", c.listTables);
adminRouter.post("/tables", c.createTable);
adminRouter.get("/tables/:id", c.getTable);
adminRouter.patch("/tables/:id", c.updateTable);
adminRouter.delete("/tables/:id", c.deleteTable);
adminRouter.post("/tables/:id/regenerate-qr", c.regenerateQr);

adminRouter.get("/restaurant", c.getRestaurant);
adminRouter.patch("/restaurant", c.updateRestaurant);
adminRouter.post("/restaurant/logo", imageUpload, c.uploadLogo);
adminRouter.delete("/restaurant/logo", c.removeLogo);

adminRouter.get("/translate/status", c.translateStatus);
adminRouter.post("/translate", translateLimiter, c.translateTexts);
adminRouter.post("/translate/menu", translateLimiter, c.translateMenu);

adminRouter.get("/profile", authC.getProfile);
adminRouter.patch("/profile", authC.updateProfile);
adminRouter.patch("/password", authC.changePassword);
