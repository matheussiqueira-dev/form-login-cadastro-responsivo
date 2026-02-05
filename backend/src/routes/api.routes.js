import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { healthRouter } from "../modules/health/health.routes.js";
import { auditRouter } from "../modules/audit/audit.routes.js";
import { docsRouter } from "./docs.routes.js";

const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", auditRouter);
apiRouter.use("/docs", docsRouter);

export { apiRouter };
