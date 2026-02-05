import { bootstrap } from "./bootstrap.js";
import { env } from "./config/env.js";
import { logger } from "./core/logger.js";
import { app } from "./app.js";

let server;

async function startServer() {
  await bootstrap();

  server = app.listen(env.port, () => {
    logger.info({ port: env.port }, "Backend running");
  });
}

function shutdown(signal) {
  logger.info({ signal }, "Graceful shutdown requested");

  if (!server) {
    process.exit(0);
  }

  server.close((error) => {
    if (error) {
      logger.error({ err: error }, "Error while closing server");
      process.exit(1);
      return;
    }

    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer().catch((error) => {
  logger.error({ err: error }, "Failed to start backend");
  process.exit(1);
});
