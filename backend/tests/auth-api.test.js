import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import request from "supertest";

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pulse-id-backend-test-"));
const tempDbPath = path.join(tempDir, "db.json");

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.DATA_FILE_PATH = tempDbPath;
process.env.ACCESS_TOKEN_SECRET = "test-secret-access";

const { bootstrap } = await import("../src/bootstrap.js");
const { app } = await import("../src/app.js");

before(async () => {
  await bootstrap();
});

after(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

test("auth API end-to-end", async () => {
  const http = request(app);

  const registerAdminResponse = await http.post("/api/v1/auth/register").send({
    name: "Admin User",
    email: "admin@pulseid.app",
    password: "Admin@1234",
  });

  assert.equal(registerAdminResponse.statusCode, 201);
  assert.equal(registerAdminResponse.body.success, true);
  assert.equal(registerAdminResponse.body.data.user.email, "admin@pulseid.app");
  assert.deepEqual(registerAdminResponse.body.data.user.roles.sort(), [
    "admin",
    "user",
  ]);

  const adminAccessToken = registerAdminResponse.body.data.tokens.accessToken;
  const adminRefreshToken = registerAdminResponse.body.data.tokens.refreshToken;
  assert.ok(adminAccessToken);
  assert.ok(adminRefreshToken);

  const meResponse = await http
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${adminAccessToken}`);

  assert.equal(meResponse.statusCode, 200);
  assert.equal(meResponse.body.data.user.name, "Admin User");

  const metricsResponse = await http
    .get("/api/v1/auth/metrics")
    .set("Authorization", `Bearer ${adminAccessToken}`);

  assert.equal(metricsResponse.statusCode, 200);
  assert.equal(metricsResponse.body.data.totalUsers, 1);

  const refreshResponse = await http.post("/api/v1/auth/refresh").send({
    refreshToken: adminRefreshToken,
  });

  assert.equal(refreshResponse.statusCode, 200);
  assert.ok(refreshResponse.body.data.tokens.accessToken);
  assert.ok(refreshResponse.body.data.tokens.refreshToken);

  const logoutResponse = await http.post("/api/v1/auth/logout").send({
    refreshToken: refreshResponse.body.data.tokens.refreshToken,
  });

  assert.equal(logoutResponse.statusCode, 200);

  const forgotResponse = await http
    .post("/api/v1/auth/forgot-password")
    .send({ email: "admin@pulseid.app" });

  assert.equal(forgotResponse.statusCode, 202);
  assert.ok(forgotResponse.body.data.resetToken);

  const resetResponse = await http.post("/api/v1/auth/reset-password").send({
    token: forgotResponse.body.data.resetToken,
    newPassword: "NewAdmin@123",
  });

  assert.equal(resetResponse.statusCode, 200);

  const oldPasswordLogin = await http.post("/api/v1/auth/login").send({
    email: "admin@pulseid.app",
    password: "Admin@1234",
  });

  assert.equal(oldPasswordLogin.statusCode, 401);

  const newPasswordLogin = await http.post("/api/v1/auth/login").send({
    email: "admin@pulseid.app",
    password: "NewAdmin@123",
  });

  assert.equal(newPasswordLogin.statusCode, 200);
  const renewedAdminToken = newPasswordLogin.body.data.tokens.accessToken;

  const registerUserResponse = await http.post("/api/v1/auth/register").send({
    name: "Common User",
    email: "user@pulseid.app",
    password: "User@12345",
  });

  assert.equal(registerUserResponse.statusCode, 201);
  assert.deepEqual(registerUserResponse.body.data.user.roles, ["user"]);

  const userToken = registerUserResponse.body.data.tokens.accessToken;

  const forbiddenMetrics = await http
    .get("/api/v1/auth/metrics")
    .set("Authorization", `Bearer ${userToken}`);

  assert.equal(forbiddenMetrics.statusCode, 403);

  const auditResponse = await http
    .get("/api/v1/admin/audit-logs?limit=10")
    .set("Authorization", `Bearer ${renewedAdminToken}`);

  assert.equal(auditResponse.statusCode, 200);
  assert.ok(Array.isArray(auditResponse.body.data.items));
  assert.ok(auditResponse.body.data.items.length > 0);
});
