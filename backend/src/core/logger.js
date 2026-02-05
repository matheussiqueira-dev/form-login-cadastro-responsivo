import pino from "pino";
import { env } from "../config/env.js";

const logger = pino({
  level: env.logLevel,
  base: {
    service: "pulse-id-backend",
    env: env.nodeEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export { logger };
