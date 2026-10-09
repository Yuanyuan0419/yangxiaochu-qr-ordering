import { z } from "zod";
import { requiredText } from "./common";

const email = z.string().trim().toLowerCase().email("v.email").max(191, "v.tooLong|191");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "v.required").max(200),
});

export const profileSchema = z.object({
  displayName: requiredText(100).optional(),
  email: email.optional(),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, "v.required").max(200),
  newPassword: z.string().min(8, "v.passwordMin").max(200).regex(/[A-Za-z]/, "v.passwordLetter").regex(/\d/, "v.passwordDigit"),
});
