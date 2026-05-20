import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { storage } from "./services/storage.service.js";
import { startCleanupScheduler } from "./services/cleanup.service.js";

await storage.ensureReady();
startCleanupScheduler();

const app = createApp();
app.listen(env.PORT, () => {
  console.log(`GetCompressly API listening on http://localhost:${env.PORT}`);
});
