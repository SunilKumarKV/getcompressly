import fs from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, HeadBucketCommand, S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export interface StorageProvider {
  ensureReady(): Promise<void>;
  resolve(...segments: string[]): string;
  saveOriginal(tempPath: string, key: string): Promise<string>;
  saveCompressed(tempPath: string, key: string): Promise<string>;
  getLocalPath(key: string): Promise<string>;
  remove(key: string | null | undefined): Promise<void>;
  isReady(): Promise<boolean>;
}

class LocalStorageProvider implements StorageProvider {
  private root = path.resolve(env.UPLOAD_DIR);

  async ensureReady() {
    await fs.mkdir(this.resolve("originals"), { recursive: true });
    await fs.mkdir(this.resolve("compressed"), { recursive: true });
    await fs.mkdir(this.resolve("work"), { recursive: true });
  }

  resolve(...segments: string[]) {
    return path.resolve(this.root, ...segments);
  }

  async saveOriginal(tempPath: string, key: string) {
    await this.ensureReady();
    const destination = this.resolve("originals", path.basename(key));
    if (path.resolve(tempPath) !== destination) await fs.rename(tempPath, destination);
    return destination;
  }

  async saveCompressed(tempPath: string, key: string) {
    await this.ensureReady();
    const destination = this.resolve("compressed", path.basename(key));
    if (path.resolve(tempPath) !== destination) await fs.rename(tempPath, destination);
    return destination;
  }

  async getLocalPath(key: string) {
    const resolved = path.resolve(key);
    if (!resolved.startsWith(this.root)) throw new AppError("Invalid storage key", 400, "INVALID_STORAGE_KEY");
    await fs.access(resolved);
    return resolved;
  }

  async remove(key: string | null | undefined) {
    if (!key) return;
    const resolved = path.resolve(key);
    if (!resolved.startsWith(this.root)) return;
    await fs.rm(resolved, { force: true });
  }

  async isReady() {
    await this.ensureReady();
    return true;
  }
}

class S3StorageProvider implements StorageProvider {
  private client = new S3Client({
    region: env.AWS_REGION,
    credentials: env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY } : undefined
  });
  private bucket = env.AWS_S3_BUCKET ?? "";
  private workRoot = path.resolve(env.UPLOAD_DIR, "work");

  async ensureReady() {
    if (!this.bucket) throw new AppError("AWS_S3_BUCKET is required for S3 storage", 500, "S3_NOT_CONFIGURED");
    await fs.mkdir(this.workRoot, { recursive: true });
    await fs.mkdir(this.resolve("originals"), { recursive: true });
    await fs.mkdir(this.resolve("compressed"), { recursive: true });
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }

  resolve(...segments: string[]) {
    return path.resolve(this.workRoot, ...segments);
  }

  async saveOriginal(tempPath: string, key: string) {
    return this.putFile(tempPath, `originals/${path.basename(key)}`);
  }

  async saveCompressed(tempPath: string, key: string) {
    return this.putFile(tempPath, `compressed/${path.basename(key)}`);
  }

  async getLocalPath(key: string) {
    await this.ensureReady();
    const localPath = this.resolve(`${Date.now()}-${path.basename(key)}`);
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!response.Body) throw new AppError("Stored file is unavailable", 404, "STORAGE_FILE_MISSING");
    await fs.writeFile(localPath, Buffer.from(await response.Body.transformToByteArray()));
    return localPath;
  }

  async remove(key: string | null | undefined) {
    if (!key) return;
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })).catch(() => undefined);
  }

  async isReady() {
    await this.ensureReady();
    return true;
  }

  private async putFile(tempPath: string, key: string) {
    await this.ensureReady();
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: await fs.readFile(tempPath) }));
    await fs.rm(tempPath, { force: true });
    return key;
  }
}

export const storage: StorageProvider = env.STORAGE_PROVIDER === "s3" ? new S3StorageProvider() : new LocalStorageProvider();
