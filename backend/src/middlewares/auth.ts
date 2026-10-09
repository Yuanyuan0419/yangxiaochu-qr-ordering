import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../utils/prisma";
import { forbidden, unauthorized } from "../utils/http";

export const SESSION_COOKIE = "yxc_session";

type SessionPayload = { sub: string };

export function signSession(userId: number): string {
  return jwt.sign({ sub: String(userId) } satisfies SessionPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  // Phones on the LAN reach the dev server over plain http, so `secure` is production-only.
  secure: env.isProd,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Authenticates the session cookie and resolves the restaurant the user belongs to.
 * Every admin query must scope by `req.auth.restaurantId` — never by a client-supplied id.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw unauthorized();

    let payload: SessionPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as SessionPayload;
    } catch {
      throw unauthorized("auth.expired");
    }

    const userId = Number(payload.sub);
    const membership = await prisma.restaurantUser.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { restaurantId: true, role: true },
    });
    if (!membership) throw forbidden("auth.noRestaurant");

    req.auth = { userId, restaurantId: membership.restaurantId, role: membership.role };
    next();
  } catch (err) {
    next(err);
  }
}

/** Narrowing helper for handlers mounted behind requireAuth. */
export function auth(req: Request) {
  if (!req.auth) throw unauthorized();
  return req.auth;
}
