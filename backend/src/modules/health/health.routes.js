import { Router } from "express";
import { healthController } from "./health.controller.js";

const healthRouter = Router();

healthRouter.get("/", healthController.check);

export { healthRouter };
