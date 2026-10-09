import type { NextFunction, Request, RequestHandler, Response } from "express";

type Params = Record<string, string | number>;

/** Errors carry an i18n key; the error middleware translates it into the caller's language. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public key: string,
    public code?: string,
    public params: Params = {},
    public details?: unknown,
  ) {
    super(key);
  }
}

export const badRequest = (key: string, params?: Params, details?: unknown) => new HttpError(400, key, "BAD_REQUEST", params, details);
export const unauthorized = (key = "auth.required") => new HttpError(401, key, "UNAUTHORIZED");
export const forbidden = (key = "generic.forbidden") => new HttpError(403, key, "FORBIDDEN");
export const notFound = (key = "generic.notFound") => new HttpError(404, key, "NOT_FOUND");
export const conflict = (key: string, params?: Params, details?: unknown, code = "CONFLICT") => new HttpError(409, key, code, params, details);

/** Wraps an async route handler so rejected promises reach the error middleware. */
export const asyncHandler =
  <T extends Request = Request>(fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req as T, res, next).catch(next);
  };

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw notFound();
  return id;
}
