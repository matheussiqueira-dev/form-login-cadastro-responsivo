import { Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate, authorizeRoles } from "../../middlewares/auth.js";
import { authRateLimiter } from "../../middlewares/rate-limit.js";
import { authController } from "./auth.controller.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  profileUpdateSchema,
  refreshSchema,
  registerSchema,
  revokeSessionSchema,
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
authRouter.patch(
  "/profile",
  authenticate,
  validate(profileUpdateSchema),
  asyncHandler(authController.updateProfile)
);
authRouter.post(
  "/change-password",
  authenticate,
  authRateLimiter,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword)
);
authRouter.get("/sessions", authenticate, asyncHandler(authController.sessions));
authRouter.delete(
  "/sessions/:sessionId",
  authenticate,
  validate(revokeSessionSchema),
  asyncHandler(authController.revokeSession)
);
authRouter.delete(
  "/sessions",
  authenticate,
  asyncHandler(authController.revokeAllSessions)
);
authRouter.get(
  "/metrics",
  authenticate,
  authorizeRoles("admin"),
  asyncHandler(authController.metrics)
);

export { authRouter };
