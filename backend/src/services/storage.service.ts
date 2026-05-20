import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";

export interface StorageService {
  ensureReady(): Promise<void>;
  resolve(...segments: string[]): string;
  remove(filePath: string | null | undefined): Promise<void>;
}

class LocalStorageService implements StorageService {
  private root = path.resolve(env.UPLOAD_DIR);

  async ensureReady() {
    await fs.mkdir(this.resolve("originals"), { recursive: true });
    await fs.mkdir(this.resolve("compressed"), { recursive: true });
  }

  resolve(...segments: string[]) {
    return path.resolve(this.root, ...segments);
  }

  async remove(filePath: string | null | undefined) {
    if (!filePath) return;
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(this.root)) return;
    await fs.rm(resolved, { force: true });
  }
}

export const storage = new LocalStorageService();
