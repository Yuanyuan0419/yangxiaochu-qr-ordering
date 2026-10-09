import path from "node:path";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  UPLOAD_DIR: z.string().optional(),
  /** Optional. DeepL API key (free keys end in ":fx"). Enables one-tap EN/FR translation in the owner app. */
  DEEPL_API_KEY: z.string().trim().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const REPO_ROOT = path.resolve(__dirname, "../../..");

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === "production",
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
  uploadDir: parsed.data.UPLOAD_DIR ? path.resolve(parsed.data.UPLOAD_DIR) : path.join(REPO_ROOT, "uploads"),
  frontendDist: path.join(REPO_ROOT, "frontend", "dist"),
};
