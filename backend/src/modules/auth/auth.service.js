import { v4 as uuidv4 } from "uuid";
import {
  AppError,
  conflict,
  forbidden,
  notFound,
  unauthorized,
} from "../../core/errors.js";
import { env } from "../../config/env.js";
import { hashPassword, verifyPassword } from "./password.service.js";
import {
  createAccessToken,
  createOpaqueToken,
  createPasswordResetExpiry,
  createRefreshTokenExpiry,
  hashToken,
} from "./token.service.js";
import { normalizeEmail, normalizeName, toPublicUser } from "./auth.utils.js";

function nowIso() {
  return new Date().toISOString();
}

function isLocked(lockUntil) {
  if (!lockUntil) {
    return false;
  }

  return new Date(lockUntil).getTime() > Date.now();
}

function buildAuthPayload(user, tokens) {
  return {
    user: toPublicUser(user),
    tokens: {
      tokenType: "Bearer",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: env.accessTokenTtl,
    },
  };
}

export class AuthService {
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  async register(payload, context) {
    const email = normalizeEmail(payload.email);
    const name = normalizeName(payload.name);

    const existingUser = this.authRepository.findUserByEmail(email);
    if (existingUser) {
      throw conflict("Já existe conta cadastrada para este e-mail.");
    }

    const now = nowIso();
    const isFirstUser = this.authRepository.countUsers() === 0;

    const user = {
      id: uuidv4(),
      name,
      email,
      passwordHash: await hashPassword(payload.password),
      roles: isFirstUser ? ["admin", "user"] : ["user"],
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      isActive: true,
      failedLoginCount: 0,
      lockUntil: null,
    };

    await this.authRepository.createUser(user);
    await this.authRepository.addAuditLog(
      this.buildAuditEvent("auth.register.success", {
        userId: user.id,
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
      })
    );

    const tokens = await this.issueSession(user, context, "auth.login.success");
    return buildAuthPayload(user, tokens);
  }

  async login(payload, context) {
    const email = normalizeEmail(payload.email);
    const genericAuthError = unauthorized("E-mail ou senha inválidos.");
    const user = this.authRepository.findUserByEmail(email);

    if (!user) {
      await this.authRepository.addAuditLog(
        this.buildAuditEvent("auth.login.failure", {
          ip: context.ip,
          userAgent: context.userAgent,
          requestId: context.requestId,
          metadata: { email },
        })
      );
      throw genericAuthError;
    }

    if (!user.isActive) {
      throw forbidden("Conta desativada. Entre em contato com o suporte.");
    }

    if (isLocked(user.lockUntil)) {
      const waitSeconds = Math.ceil(
        (new Date(user.lockUntil).getTime() - Date.now()) / 1000
      );
      throw new AppError(
        `Conta temporariamente bloqueada. Tente novamente em ${waitSeconds}s.`,
        {
          statusCode: 423,
          code: "ACCOUNT_LOCKED",
        }
      );
    }

    const passwordMatches = await verifyPassword(payload.password, user.passwordHash);

    if (!passwordMatches) {
      const maxFailures = env.loginMaxFailures;
      const nextFailureCount = (user.failedLoginCount ?? 0) + 1;

      const lockUntil =
        nextFailureCount >= maxFailures
          ? new Date(
              Date.now() + env.loginLockMinutes * 60 * 1000
            ).toISOString()
          : null;

      await this.authRepository.updateUser(user.id, (currentUser) => ({
        ...currentUser,
        failedLoginCount: nextFailureCount >= maxFailures ? 0 : nextFailureCount,
        lockUntil,
        updatedAt: nowIso(),
      }));

      await this.authRepository.addAuditLog(
        this.buildAuditEvent("auth.login.failure", {
          userId: user.id,
          ip: context.ip,
          userAgent: context.userAgent,
          requestId: context.requestId,
          metadata: {
            failureCount: nextFailureCount,
            locked: Boolean(lockUntil),
          },
        })
      );

      if (lockUntil) {
        throw new AppError(
          `Conta bloqueada por ${env.loginLockMinutes} minuto(s) após tentativas inválidas.`,
          {
            statusCode: 423,
            code: "ACCOUNT_LOCKED",
          }
        );
      }

      throw genericAuthError;
    }

    const updatedUser = await this.authRepository.updateUser(user.id, (currentUser) => ({
      ...currentUser,
      failedLoginCount: 0,
      lockUntil: null,
      lastLoginAt: nowIso(),
      updatedAt: nowIso(),
    }));

    if (!updatedUser) {
      throw unauthorized("Não foi possível concluir o login.");
    }

    const tokens = await this.issueSession(updatedUser, context, "auth.login.success");
    return buildAuthPayload(updatedUser, tokens);
  }

  async refresh(payload, context) {
    const refreshToken = payload.refreshToken;
    const refreshTokenHash = hashToken(refreshToken);
    const storedToken = this.authRepository.findRefreshTokenByHash(refreshTokenHash);

    if (!storedToken || storedToken.revokedAt) {
      throw unauthorized("Refresh token inválido.");
    }

    if (new Date(storedToken.expiresAt).getTime() <= Date.now()) {
      throw unauthorized("Refresh token expirado.");
    }

    const user = this.authRepository.findUserById(storedToken.userId);
    if (!user) {
      throw unauthorized("Sessão inválida.");
    }

    const newPlainRefreshToken = createOpaqueToken(48);
    const newTokenRecord = {
      id: uuidv4(),
      userId: user.id,
      tokenHash: hashToken(newPlainRefreshToken),
      createdAt: nowIso(),
      expiresAt: createRefreshTokenExpiry(),
      revokedAt: null,
      revokeReason: null,
      replacedByTokenId: null,
      ip: context.ip,
      userAgent: context.userAgent,
    };

    await this.authRepository.revokeRefreshTokenById(storedToken.id, {
      revokeReason: "rotated",
      replacedByTokenId: newTokenRecord.id,
      revokedAt: nowIso(),
    });

    await this.authRepository.addRefreshToken(newTokenRecord);

    await this.authRepository.addAuditLog(
      this.buildAuditEvent("auth.refresh.success", {
        userId: user.id,
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
      })
    );

    return {
      user: toPublicUser(user),
      tokens: {
        tokenType: "Bearer",
        accessToken: createAccessToken(user),
        refreshToken: newPlainRefreshToken,
        expiresIn: env.accessTokenTtl,
      },
    };
  }

  async logout(payload, context) {
    const refreshTokenHash = hashToken(payload.refreshToken);
    const storedToken = this.authRepository.findRefreshTokenByHash(refreshTokenHash);

    if (storedToken && !storedToken.revokedAt) {
      await this.authRepository.revokeRefreshTokenById(storedToken.id, {
        revokeReason: "logout",
        revokedAt: nowIso(),
      });

      await this.authRepository.addAuditLog(
        this.buildAuditEvent("auth.logout.success", {
          userId: storedToken.userId,
          ip: context.ip,
          userAgent: context.userAgent,
          requestId: context.requestId,
        })
      );
    }

    return {
      message: "Sessão encerrada com sucesso.",
    };
  }

  async forgotPassword(payload, context) {
    const email = normalizeEmail(payload.email);
    const user = this.authRepository.findUserByEmail(email);

    if (!user) {
      await this.authRepository.addAuditLog(
        this.buildAuditEvent("auth.password.forgot.ignored", {
          ip: context.ip,
          userAgent: context.userAgent,
          requestId: context.requestId,
          metadata: { email },
        })
      );

      return {
        message:
          "Se o e-mail existir, um link de recuperação será enviado em instantes.",
      };
    }

    const plainResetToken = createOpaqueToken(36);

    await this.authRepository.createPasswordResetToken({
      id: uuidv4(),
      userId: user.id,
      tokenHash: hashToken(plainResetToken),
      createdAt: nowIso(),
      expiresAt: createPasswordResetExpiry(),
      usedAt: null,
    });

    await this.authRepository.addAuditLog(
      this.buildAuditEvent("auth.password.forgot.created", {
        userId: user.id,
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
      })
    );

    return {
      message:
        "Se o e-mail existir, um link de recuperação será enviado em instantes.",
      ...(env.nodeEnv !== "production" ? { resetToken: plainResetToken } : {}),
    };
  }

  async resetPassword(payload, context) {
    const tokenHash = hashToken(payload.token);
    const tokenRecord = this.authRepository.findPasswordResetTokenByHash(tokenHash);

    if (!tokenRecord || tokenRecord.usedAt) {
      throw unauthorized("Token de recuperação inválido ou já utilizado.");
    }

    if (new Date(tokenRecord.expiresAt).getTime() <= Date.now()) {
      throw unauthorized("Token de recuperação expirado.");
    }

    const user = this.authRepository.findUserById(tokenRecord.userId);
    if (!user) {
      throw notFound("Usuário relacionado ao token não encontrado.");
    }

    const nextPasswordHash = await hashPassword(payload.newPassword);

    const updatedUser = await this.authRepository.updateUser(user.id, (currentUser) => ({
      ...currentUser,
      passwordHash: nextPasswordHash,
      failedLoginCount: 0,
      lockUntil: null,
      updatedAt: nowIso(),
    }));

    if (!updatedUser) {
      throw notFound("Usuário não disponível para atualização de senha.");
    }

    await this.authRepository.markPasswordResetTokenUsed(tokenRecord.id);
    await this.authRepository.revokeAllRefreshTokensForUser(user.id, "password_reset");

    await this.authRepository.addAuditLog(
      this.buildAuditEvent("auth.password.reset.success", {
        userId: user.id,
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
      })
    );

    return {
      message: "Senha redefinida com sucesso. Faça login novamente.",
    };
  }

  async getCurrentUser(userId) {
    const user = this.authRepository.findUserById(userId);
    if (!user) {
      throw unauthorized("Sessão inválida.");
    }

    if (!user.isActive) {
      throw forbidden("Conta desativada.");
    }

    return toPublicUser(user);
  }

  getMetrics() {
    return this.authRepository.getAuthMetrics();
  }

  getAuditLogs(filters) {
    return this.authRepository.listAuditLogs(filters);
  }

  async issueSession(user, context, auditType) {
    const plainRefreshToken = createOpaqueToken(48);
    const refreshTokenRecord = {
      id: uuidv4(),
      userId: user.id,
      tokenHash: hashToken(plainRefreshToken),
      createdAt: nowIso(),
      expiresAt: createRefreshTokenExpiry(),
      revokedAt: null,
      revokeReason: null,
      replacedByTokenId: null,
      ip: context.ip,
      userAgent: context.userAgent,
    };

    await this.authRepository.addRefreshToken(refreshTokenRecord);

    await this.authRepository.addAuditLog(
      this.buildAuditEvent(auditType, {
        userId: user.id,
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId,
      })
    );

    return {
      accessToken: createAccessToken(user),
      refreshToken: plainRefreshToken,
    };
  }

  buildAuditEvent(type, context) {
    return {
      id: uuidv4(),
      type,
      userId: context.userId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
      requestId: context.requestId ?? null,
      metadata: context.metadata ?? null,
      createdAt: nowIso(),
    };
  }
}
