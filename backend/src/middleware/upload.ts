import fs from "node:fs/promises";
import multer from "multer";
import { fileTypeFromFile } from "file-type";
import { env } from "../config/env.js";
import { storage } from "../services/storage.service.js";
import { AppError } from "../utils/AppError.js";
import { isExecutableFile, sanitizeFileName } from "../utils/files.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, storage.resolve("originals")),
  filename: (_req, file, cb) => cb(null, sanitizeFileName(file.originalname))
});

export const upload = multer({
  storage: multerStorage,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    const lower = file.originalname.toLowerCase();
    const ext = lower.slice(lower.lastIndexOf("."));
    if (isExecutableFile(lower) || !allowedExtensions.has(ext)) {
      cb(new AppError("Only JPG, PNG, WebP, and PDF files are allowed", 400, "INVALID_FILE_TYPE"));
      return;
    }
    cb(null, true);
  }
});

export const validateUploadedFiles = asyncHandler(async (req, _res, next) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw new AppError("Upload at least one file", 400, "NO_FILES");

  for (const file of files) {
    const detected = await fileTypeFromFile(file.path);
    const mime = detected?.mime ?? (file.mimetype === "application/pdf" ? "application/pdf" : "");
    if (!allowedMimeTypes.has(mime)) {
      await fs.rm(file.path, { force: true });
      throw new AppError("File contents do not match a supported image or PDF type", 400, "INVALID_MIME");
    }
    file.mimetype = mime;
  }
  next();
});
