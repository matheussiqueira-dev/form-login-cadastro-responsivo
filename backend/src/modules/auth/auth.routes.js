import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate, authorizeRoles } from "../../middlewares/auth.js";
import { authRateLimiter } from "../../middlewares/rate-limit.js";
import { authController } from "./auth.controller.js";
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.schemas.js";

const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimiter,
  validate(registerSchema),
  asyncHandler(authController.register)
);
authRouter.post(
  "/login",
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(authController.login)
);
authRouter.post(
  "/refresh",
  authRateLimiter,
  validate(refreshSchema),
  asyncHandler(authController.refresh)
);
authRouter.post(
  "/logout",
  validate(logoutSchema),
  asyncHandler(authController.logout)
);
authRouter.post(
  "/forgot-password",
  authRateLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword)
);
authRouter.post(
  "/reset-password",
  authRateLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword)
);
authRouter.get("/me", authenticate, asyncHandler(authController.me));
authRouter.get(
  "/metrics",
  authenticate,
  authorizeRoles("admin"),
  asyncHandler(authController.metrics)
);

export { authRouter };
