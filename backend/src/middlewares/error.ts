import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { langOf, t } from "../i18n";
import { HttpError } from "../utils/http";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: t(langOf(req), "generic.apiNotFound") } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const lang = langOf(req);
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { code: err.code, message: t(lang, err.key, err.params), details: err.details },
    });
  }
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      // Our schemas use i18n keys as messages; Zod's built-in messages fall back to a generic one.
      fields[key] ??= issue.message.startsWith("v.") ? t(lang, issue.message) : t(lang, "v.invalid");
    }
    return res.status(400).json({ error: { code: "VALIDATION", message: t(lang, "generic.validation"), fields } });
  }
  if (err instanceof MulterError) {
    const key = err.code === "LIMIT_FILE_SIZE" ? "upload.tooLarge" : "upload.failed";
    return res.status(400).json({ error: { code: "UPLOAD", message: t(lang, key) } });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = String(err.meta?.target ?? "");
    const key = target.includes("tableNumber") ? "table.duplicate" : "generic.duplicate";
    return res.status(409).json({ error: { code: "DUPLICATE", message: t(lang, key) } });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: { code: "BAD_JSON", message: t(lang, "generic.badJson") } });
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL", message: t(lang, "generic.internal") } });
}
