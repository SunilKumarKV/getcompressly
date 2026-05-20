import fs from "node:fs/promises";
import net from "node:net";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export interface VirusScannerService {
  scan(filePath: string): Promise<void>;
}

class DisabledVirusScanner implements VirusScannerService {
  async scan() {
    return;
  }
}

class ClamAvVirusScanner implements VirusScannerService {
  async scan(filePath: string) {
    const content = await fs.readFile(filePath);
    const host = env.CLAMAV_HOST;
    const port = env.CLAMAV_PORT;
    if (!host || !port) throw new AppError("Virus scanner is enabled but not configured", 503, "VIRUS_SCANNER_UNAVAILABLE");

    const result = await new Promise<string>((resolve, reject) => {
      const socket = net.createConnection({ host, port, timeout: 10000 }, () => {
        const command = Buffer.from("zINSTREAM\0");
        const size = Buffer.alloc(4);
        size.writeUInt32BE(content.length);
        socket.write(command);
        socket.write(size);
        socket.write(content);
        socket.write(Buffer.alloc(4));
      });
      let data = "";
      socket.on("data", (chunk) => {
        data += chunk.toString("utf8");
      });
      socket.on("end", () => resolve(data));
      socket.on("timeout", () => {
        socket.destroy();
        reject(new AppError("Virus scanner timed out", 503, "VIRUS_SCANNER_TIMEOUT"));
      });
      socket.on("error", () => reject(new AppError("Virus scanner is unavailable", 503, "VIRUS_SCANNER_UNAVAILABLE")));
    });

    if (!result.includes("OK")) {
      throw new AppError("Uploaded file failed virus scanning", 400, "VIRUS_DETECTED");
    }
  }
}

export const virusScanner: VirusScannerService = env.CLAMAV_ENABLED ? new ClamAvVirusScanner() : new DisabledVirusScanner();
