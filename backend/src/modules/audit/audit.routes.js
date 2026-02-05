import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler.js";
import { authenticate, authorizeRoles } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { auditLogQuerySchema } from "../auth/auth.schemas.js";
import { auditController } from "./audit.controller.js";

const auditRouter = Router();

auditRouter.get(
  "/audit-logs",
  authenticate,
  authorizeRoles("admin"),
  validate(auditLogQuerySchema),
  asyncHandler(auditController.list)
);

export { auditRouter };
