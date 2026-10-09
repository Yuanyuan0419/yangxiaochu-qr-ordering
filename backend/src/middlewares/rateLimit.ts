import rateLimit, { type Options } from "express-rate-limit";
import { langOf, t } from "../i18n";

const localized = (key: string): Options["handler"] => (req, res, _next, options) => {
  res.status(options.statusCode).json({ error: { code: "RATE_LIMITED", message: t(langOf(req), key) } });
};

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: localized("rate.generic"),
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: localized("rate.login"),
});

export const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: localized("rate.order"),
});

/** Protects the DeepL quota from runaway clients. */
export const translateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: localized("rate.generic"),
});

/** Password-protected actions (clear table): limits guessing, successful attempts don't count. */
export const passwordActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: localized("rate.clear"),
});
