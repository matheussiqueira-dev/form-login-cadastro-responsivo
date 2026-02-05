import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDir, "..", "..");

function readInt(name, fallback) {
  const rawValue = process.env[name];
  const value = Number.parseInt(rawValue ?? "", 10);
  return Number.isFinite(value) ? value : fallback;
}

function readString(name, fallback) {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  return value.trim();
}

const env = {
  nodeEnv: readString("NODE_ENV", "development"),
  port: readInt("PORT", 3333),
  logLevel: readString("LOG_LEVEL", "info"),
  clientOrigin: readString("CLIENT_ORIGIN", "http://localhost:8000"),
  accessTokenSecret: readString("ACCESS_TOKEN_SECRET", "dev-access-secret-change-me"),
  accessTokenTtl: readString("ACCESS_TOKEN_TTL", "15m"),
  refreshTokenTtlDays: readInt("REFRESH_TOKEN_TTL_DAYS", 7),
  passwordResetTtlMinutes: readInt("PASSWORD_RESET_TTL_MINUTES", 30),
  loginLockMinutes: readInt("LOGIN_LOCK_MINUTES", 15),
  loginMaxFailures: readInt("LOGIN_MAX_FAILURES", 5),
  dataFilePath: readString(
    "DATA_FILE_PATH",
    path.join(backendRoot, "data", "db.json")
  ),
};

export { env, backendRoot };
