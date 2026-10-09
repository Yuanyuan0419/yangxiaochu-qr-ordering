import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";

export type StorageFolder = "restaurant" | "products";

/**
 * Storage abstraction so local disk can later be swapped for S3 / Cloudinary / Supabase Storage
 * without touching services. `save` returns the public URL stored in the database.
 */
export interface StorageService {
  save(folder: StorageFolder, filename: string, data: Buffer): Promise<string>;
  remove(publicUrl: string): Promise<void>;
  owns(publicUrl: string | null | undefined): boolean;
}

const PUBLIC_PREFIX = "/uploads/";

class LocalStorage implements StorageService {
  constructor(private root: string) {}

  async save(folder: StorageFolder, filename: string, data: Buffer) {
    const dir = path.join(this.root, folder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), data);
    return `${PUBLIC_PREFIX}${folder}/${filename}`;
  }

  owns(publicUrl: string | null | undefined): publicUrl is string {
    return !!publicUrl && /^\/uploads\/(restaurant|products)\/[\w.-]+$/.test(publicUrl);
  }

  async remove(publicUrl: string) {
    if (!this.owns(publicUrl)) return;
    const target = path.resolve(this.root, publicUrl.slice(PUBLIC_PREFIX.length));
    if (!target.startsWith(this.root + path.sep)) return; // path traversal guard
    await unlink(target).catch(() => undefined);
  }
}

export const storage: StorageService = new LocalStorage(env.uploadDir);
