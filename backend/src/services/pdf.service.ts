import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CompressionLevel } from "@prisma/client";

const execFileAsync = promisify(execFile);

async function commandExists(command: string) {
  try {
    await execFileAsync(command, ["--version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function gsSettings(level: CompressionLevel) {
  if (level === "low") return "/printer";
  if (level === "high") return "/screen";
  return "/ebook";
}

export async function compressPdf(inputPath: string, outputPath: string, level: CompressionLevel) {
  if (await commandExists("gs")) {
    await execFileAsync(
      "gs",
      [
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        `-dPDFSETTINGS=${gsSettings(level)}`,
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        `-sOutputFile=${outputPath}`,
        inputPath
      ],
      { timeout: 120000 }
    );
    return;
  }

  if (await commandExists("qpdf")) {
    await execFileAsync(
      "qpdf",
      ["--linearize", "--object-streams=generate", "--compress-streams=y", inputPath, outputPath],
      { timeout: 120000 }
    );
    return;
  }

  await fs.rm(outputPath, { force: true });
  throw new Error("PDF compression requires Ghostscript or qpdf on the server. Install one of them and retry.");
}
