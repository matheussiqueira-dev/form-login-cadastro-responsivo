import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export function createAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    },
    env.accessTokenSecret,
    {
      expiresIn: env.accessTokenTtl,
      issuer: "pulse-id-backend",
      audience: "pulse-id-client",
    }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.accessTokenSecret, {
    issuer: "pulse-id-backend",
    audience: "pulse-id-client",
  });
}

export function createOpaqueToken(bytesLength = 48) {
  return crypto.randomBytes(bytesLength).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createRefreshTokenExpiry() {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + env.refreshTokenTtlDays);
  return expiresAt.toISOString();
}

export function createPasswordResetExpiry() {
  const expiresAt = new Date();
  expiresAt.setUTCMinutes(
    expiresAt.getUTCMinutes() + env.passwordResetTtlMinutes
  );
  return expiresAt.toISOString();
}
