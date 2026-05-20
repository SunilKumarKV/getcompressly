import { cleanupExpiredFiles } from "../services/cleanup.service.js";
import { prisma } from "../config/prisma.js";

const count = await cleanupExpiredFiles();
console.log(`Removed ${count} expired compression job(s).`);
await prisma.$disconnect();
