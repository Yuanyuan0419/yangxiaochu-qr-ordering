import { Router } from "express";
import * as c from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth";
import { loginLimiter } from "../middlewares/rateLimit";

export const authRouter = Router();

authRouter.post("/login", loginLimiter, c.login);
authRouter.post("/logout", c.logout);
authRouter.get("/me", requireAuth, c.me);
