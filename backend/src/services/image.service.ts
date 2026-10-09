import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { storage, type StorageFolder } from "../storage";
import { badRequest } from "../utils/http";

const PRESETS: Record<StorageFolder, { width: number; height: number; fit: "cover" | "inside" }> = {
  // Product photos: 4:3, plenty for a phone at 3x density.
  products: { width: 1200, height: 900, fit: "cover" },
  // Logos keep their aspect ratio and transparency.
  restaurant: { width: 512, height: 512, fit: "inside" },
};

/**
 * Decodes the upload with sharp (rejecting anything that is not a real raster image),
 * auto-rotates using EXIF, strips metadata and re-encodes to WebP under a random name.
 */
export async function storeImage(folder: StorageFolder, input: Buffer | undefined): Promise<string> {
  if (!input?.length) throw badRequest("upload.empty");

  let output: Buffer;
  try {
    const preset = PRESETS[folder];
    output = await sharp(input, { failOn: "error", limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: preset.width, height: preset.height, fit: preset.fit, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw badRequest("upload.invalid");
  }

  return storage.save(folder, `${randomUUID()}.webp`, output);
}
