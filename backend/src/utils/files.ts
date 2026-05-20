import crypto from "node:crypto";
import path from "node:path";
import { nanoid } from "nanoid";

const unsafeNamePattern = /[^a-zA-Z0-9._-]/g;
const executableExtensions = new Set([".exe", ".sh", ".bat", ".cmd", ".msi", ".app", ".dmg", ".js", ".jar", ".php", ".py", ".rb"]);

export function sanitizeFileName(fileName: string) {
  const parsed = path.parse(fileName);
  const base = parsed.name.replace(unsafeNamePattern, "-").slice(0, 80) || "file";
  const ext = parsed.ext.toLowerCase().replace(unsafeNamePattern, "");
  return `${base}-${nanoid(8)}${ext}`;
}

export function isExecutableFile(fileName: string) {
  return executableExtensions.has(path.extname(fileName).toLowerCase());
}

export function makeDownloadToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function compressionPercentage(originalSize: number, compressedSize: number | null | undefined) {
  if (!compressedSize || originalSize <= 0) return 0;
  return Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));
}
