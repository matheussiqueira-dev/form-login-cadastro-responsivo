import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import hpp from "hpp";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { forbidden } from "./core/errors.js";
import { logger } from "./core/logger.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFoundHandler } from "./middlewares/not-found.js";
import { generalRateLimiter } from "./middlewares/rate-limit.js";
import { requestContext } from "./middlewares/request-context.js";
import { apiRouter } from "./routes/api.routes.js";

const allowedOrigins = env.clientOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(requestContext);
app.use(
  pinoHttp({
    logger,
    genReqId: (request) => request.id,
    customProps: (request) => ({
      requestId: request.id,
    }),
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        forbidden("Origem não permitida por política CORS.")
      );
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
  })
);
app.use(hpp());
app.use(compression());
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false, limit: "16kb" }));
app.use(generalRateLimiter);

app.get("/", (_request, response) => {
  response.json({
    success: true,
    data: {
      service: "pulse-id-backend",
      version: "v1",
      docs: "/api/v1/docs",
      health: "/api/v1/health",
    },
  });
});

app.use("/api/v1", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
