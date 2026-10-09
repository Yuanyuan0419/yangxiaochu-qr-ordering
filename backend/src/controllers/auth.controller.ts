import { asyncHandler } from "../utils/http";
import { auth, SESSION_COOKIE, sessionCookieOptions, signSession } from "../middlewares/auth";
import * as authService from "../services/auth.service";
import { loginSchema, passwordSchema, profileSchema } from "../validators/auth";
import { prisma } from "../utils/prisma";

export const login = asyncHandler(async (req, res) => {
  const user = await authService.login(loginSchema.parse(req.body));
  res.cookie(SESSION_COOKIE, signSession(user.id), sessionCookieOptions);
  const membership = await prisma.restaurantUser.findFirstOrThrow({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  res.json(await authService.getSession(user.id, membership.restaurantId));
});

export const logout = asyncHandler(async (_req, res) => {
  const { maxAge: _maxAge, ...opts } = sessionCookieOptions;
  res.clearCookie(SESSION_COOKIE, opts);
  res.status(204).end();
});

export const me = asyncHandler(async (req, res) => {
  const { userId, restaurantId } = auth(req);
  res.json(await authService.getSession(userId, restaurantId));
});

export const getProfile = asyncHandler(async (req, res) => {
  res.json(await authService.getProfile(auth(req).userId));
});

export const updateProfile = asyncHandler(async (req, res) => {
  res.json(await authService.updateProfile(auth(req).userId, profileSchema.parse(req.body)));
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(auth(req).userId, passwordSchema.parse(req.body));
  res.status(204).end();
});
