import { asyncHandler, parseId } from "../utils/http";
import { auth } from "../middlewares/auth";
import * as categoryService from "../services/category.service";
import * as dashboardService from "../services/dashboard.service";
import * as orderService from "../services/order.service";
import * as productService from "../services/product.service";
import * as restaurantService from "../services/restaurant.service";
import * as tableService from "../services/table.service";
import * as sessionService from "../services/session.service";
import * as ingredientService from "../services/ingredient.service";
import { storeImage } from "../services/image.service";
import { autoTranslateMenu, countMissingTranslations } from "../services/autoTranslate.service";
import { translateBoth, translationEnabled } from "../services/translate.service";
import {
  bulkAcceptSchema,
  closeSessionSchema,
  splitSessionSchema,
  clearSessionSchema,
  itemServedSchema,
  orderListQuery,
  orderStatusSchema,
  sessionListQuery,
} from "../validators/order";
import {
  categoryReorderSchema,
  categorySchema,
  categoryUpdateSchema,
  ingredientUpdateSchema,
  productListQuery,
  productSchema,
  productUpdateSchema,
  restaurantUpdateSchema,
  tableSchema,
  tableUpdateSchema,
  translateSchema,
} from "../validators/menu";

const rid = (req: Parameters<typeof auth>[0]) => auth(req).restaurantId;

// Dashboard
export const dashboard = asyncHandler(async (req, res) => res.json(await dashboardService.getDashboard(rid(req))));

// Orders
export const listOrders = asyncHandler(async (req, res) =>
  res.json(await orderService.listOrders(rid(req), orderListQuery.parse(req.query))),
);
export const getOrder = asyncHandler(async (req, res) => res.json(await orderService.getOrder(rid(req), parseId(req.params.id))));
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = orderStatusSchema.parse(req.body);
  res.json(await orderService.updateOrderStatus(rid(req), auth(req).userId, parseId(req.params.id), status));
});

export const acceptOrders = asyncHandler(async (req, res) =>
  res.json(await orderService.acceptOrders(rid(req), auth(req).userId, bulkAcceptSchema.parse(req.body).ids)),
);
export const setItemServed = asyncHandler(async (req, res) => {
  const { served } = itemServedSchema.parse(req.body);
  res.json(await orderService.setItemServed(rid(req), auth(req).userId, parseId(req.params.id), parseId(req.params.itemId), served));
});
export const serveAll = asyncHandler(async (req, res) =>
  res.json(await orderService.serveAll(rid(req), auth(req).userId, parseId(req.params.id))),
);

// Bills (table sessions)
export const listSessions = asyncHandler(async (req, res) => {
  const { from, to } = sessionListQuery.parse(req.query);
  res.json(await sessionService.listClosedSessions(rid(req), from, to));
});
export const getSession = asyncHandler(async (req, res) => res.json(await sessionService.getSession(rid(req), parseId(req.params.id))));
export const closeSession = asyncHandler(async (req, res) => {
  const { paymentMethod } = closeSessionSchema.parse(req.body);
  res.json(await sessionService.closeSession(rid(req), auth(req).userId, parseId(req.params.id), paymentMethod));
});

export const confirmSameGuests = asyncHandler(async (req, res) =>
  res.json(await orderService.confirmSameGuests(rid(req), parseId(req.params.id))),
);
export const splitSession = asyncHandler(async (req, res) => {
  const { paymentMethod, moveOrderIds } = splitSessionSchema.parse(req.body);
  res.json(await sessionService.splitAndClose(rid(req), auth(req).userId, parseId(req.params.id), paymentMethod, moveOrderIds));
});

export const clearSession = asyncHandler(async (req, res) => {
  const { password, note } = clearSessionSchema.parse(req.body);
  res.json(await sessionService.clearSession(rid(req), auth(req).userId, parseId(req.params.id), password, note));
});

// Products
export const listProducts = asyncHandler(async (req, res) =>
  res.json(await productService.listProducts(rid(req), productListQuery.parse(req.query))),
);
export const getProduct = asyncHandler(async (req, res) => res.json(await productService.getProduct(rid(req), parseId(req.params.id))));
export const createProduct = asyncHandler(async (req, res) =>
  res.status(201).json(await productService.createProduct(rid(req), productSchema.parse(req.body))),
);
export const updateProduct = asyncHandler(async (req, res) =>
  res.json(await productService.updateProduct(rid(req), parseId(req.params.id), productUpdateSchema.parse(req.body))),
);
export const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(rid(req), parseId(req.params.id));
  res.status(204).end();
});
export const uploadProductImage = asyncHandler(async (req, res) => {
  auth(req);
  res.status(201).json({ url: await storeImage("products", req.file?.buffer) });
});
export const listAllergens = asyncHandler(async (_req, res) => res.json(await productService.listAllergens()));
export const listIngredients = asyncHandler(async (req, res) => res.json(await ingredientService.listIngredients(rid(req))));
export const updateIngredient = asyncHandler(async (req, res) =>
  res.json(await ingredientService.updateIngredient(rid(req), parseId(req.params.id), ingredientUpdateSchema.parse(req.body))),
);
export const deleteIngredient = asyncHandler(async (req, res) => {
  await ingredientService.deleteIngredient(rid(req), parseId(req.params.id));
  res.status(204).end();
});

// Categories
export const listCategories = asyncHandler(async (req, res) => res.json(await categoryService.listCategories(rid(req))));
export const createCategory = asyncHandler(async (req, res) =>
  res.status(201).json(await categoryService.createCategory(rid(req), categorySchema.parse(req.body))),
);
export const updateCategory = asyncHandler(async (req, res) =>
  res.json(await categoryService.updateCategory(rid(req), parseId(req.params.id), categoryUpdateSchema.parse(req.body))),
);
export const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(rid(req), parseId(req.params.id));
  res.status(204).end();
});
export const reorderCategories = asyncHandler(async (req, res) =>
  res.json(await categoryService.reorderCategories(rid(req), categoryReorderSchema.parse(req.body).ids)),
);

// Tables
export const listTables = asyncHandler(async (req, res) => res.json(await sessionService.listTablesWithBills(rid(req))));
export const getTable = asyncHandler(async (req, res) => res.json(await sessionService.getTableWithBill(rid(req), parseId(req.params.id))));
export const createTable = asyncHandler(async (req, res) =>
  res.status(201).json(await tableService.createTable(rid(req), tableSchema.parse(req.body))),
);
export const updateTable = asyncHandler(async (req, res) =>
  res.json(await tableService.updateTable(rid(req), parseId(req.params.id), tableUpdateSchema.parse(req.body))),
);
export const deleteTable = asyncHandler(async (req, res) => {
  await tableService.deleteTable(rid(req), parseId(req.params.id));
  res.status(204).end();
});
export const regenerateQr = asyncHandler(async (req, res) => res.json(await tableService.regenerateQr(rid(req), parseId(req.params.id))));

// Restaurant
export const getRestaurant = asyncHandler(async (req, res) => res.json(await restaurantService.getRestaurant(rid(req))));
export const updateRestaurant = asyncHandler(async (req, res) =>
  res.json(await restaurantService.updateRestaurant(rid(req), restaurantUpdateSchema.parse(req.body))),
);
export const uploadLogo = asyncHandler(async (req, res) => res.json(await restaurantService.setLogo(rid(req), req.file?.buffer)));
export const removeLogo = asyncHandler(async (req, res) => res.json(await restaurantService.removeLogo(rid(req))));

// Translation (DeepL)
export const translateStatus = asyncHandler(async (req, res) =>
  res.json({ enabled: translationEnabled(), missing: await countMissingTranslations(rid(req)) }),
);
export const translateTexts = asyncHandler(async (req, res) => {
  auth(req);
  const { texts, kind } = translateSchema.parse(req.body);
  res.json(await translateBoth(texts, kind));
});
export const translateMenu = asyncHandler(async (req, res) => res.json(await autoTranslateMenu(rid(req))));
