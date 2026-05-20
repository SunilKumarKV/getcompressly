import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { FileType } from "@prisma/client";
import { env } from "../config/env.js";
import { ValidationFailure } from "./validation-error.js";

const execFileAsync = promisify(execFile);

export async function validateImageLimits(filePath: string) {
  const metadata = await sharp(filePath, { limitInputPixels: env.MAX_IMAGE_PIXELS, failOn: "warning" }).metadata();
  if (!metadata.width || !metadata.height) throw new ValidationFailure("Image dimensions could not be read");
  if (metadata.width > env.MAX_IMAGE_DIMENSION || metadata.height > env.MAX_IMAGE_DIMENSION) {
    throw new ValidationFailure(`Image dimensions exceed ${env.MAX_IMAGE_DIMENSION}px`);
  }
  if (metadata.width * metadata.height > env.MAX_IMAGE_PIXELS) {
    throw new ValidationFailure(`Image exceeds ${env.MAX_IMAGE_PIXELS} total pixels`);
  }
}

export async function validatePdfPageLimit(filePath: string, maxPages = env.MAX_PDF_PAGES) {
  const pageCount = await getPdfPageCount(filePath);
  if (pageCount > maxPages) throw new ValidationFailure(`PDF exceeds the ${maxPages} page limit`);
}

export async function validateFileForCompression(filePath: string, fileType: FileType, maxPdfPages = env.MAX_PDF_PAGES) {
  if (fileType === FileType.IMAGE) await validateImageLimits(filePath);
  else await validatePdfPageLimit(filePath, maxPdfPages);
}

async function getPdfPageCount(filePath: string) {
  try {
    const { stdout } = await execFileAsync("qpdf", ["--show-npages", filePath], { timeout: 10000 });
    const count = Number(stdout.trim());
    if (Number.isInteger(count) && count > 0) return count;
  } catch {
    // Fall through to pdfinfo.
  }

  try {
    const { stdout } = await execFileAsync("pdfinfo", [filePath], { timeout: 10000 });
    const pages = stdout.match(/^Pages:\s+(\d+)/im)?.[1];
    const count = pages ? Number(pages) : 0;
    if (Number.isInteger(count) && count > 0) return count;
  } catch {
    throw new ValidationFailure("PDF page count could not be validated. Install qpdf or poppler-utils/pdfinfo.");
  }

  throw new ValidationFailure("PDF page count could not be validated");
}
