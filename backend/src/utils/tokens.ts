import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** URL-safe random token without ambiguous characters (0/O, 1/l/I). */
export function randomToken(length = 10): string {
  const bytes = randomBytes(length * 2);
  let out = "";
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    // Rejection sampling keeps the distribution uniform.
    const b = bytes[i];
    if (b < 256 - (256 % ALPHABET.length)) out += ALPHABET[b % ALPHABET.length];
  }
  return out.length === length ? out : randomToken(length);
}

export const newQrToken = () => randomToken(10);
export const newOrderPublicId = () => randomToken(16);
