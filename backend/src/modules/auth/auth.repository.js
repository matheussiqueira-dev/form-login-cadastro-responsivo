function nowTimestamp() {
  return Date.now();
}

function isExpired(isoDate) {
  return new Date(isoDate).getTime() <= nowTimestamp();
}

function isOlderThanDays(isoDate, days) {
  const threshold = nowTimestamp() - days * 24 * 60 * 60 * 1000;
  return new Date(isoDate).getTime() < threshold;
}

export class AuthRepository {
  constructor(database) {
    this.database = database;
  }

  listUsers() {
    return this.database.getSnapshot().users;
  }

  countUsers() {
    return this.database.getSnapshot().users.length;
  }

  findUserByEmail(email) {
    return (
      this.database
        .getSnapshot()
        .users.find((user) => user.email === email) ?? null
    );
  }

  findUserById(userId) {
    return (
      this.database
        .getSnapshot()
        .users.find((user) => user.id === userId) ?? null
    );
  }

  async createUser(user) {
    await this.database.mutate((draft) => {
      draft.users.push(user);
      this.pruneExpired(draft);
    });

    return user;
  }

  async updateUser(userId, updateFn) {
    return this.database.mutate((draft) => {
      const userIndex = draft.users.findIndex((user) => user.id === userId);
      if (userIndex === -1) {
        return null;
      }

      const currentUser = draft.users[userIndex];
      return Promise.resolve(updateFn({ ...currentUser })).then((updatedUser) => {
        draft.users[userIndex] = updatedUser;
        this.pruneExpired(draft);
        return updatedUser;
      });
    });
  }

  async addRefreshToken(record) {
    await this.database.mutate((draft) => {
      draft.refreshTokens.push(record);
      this.pruneExpired(draft);
    });

    return record;
  }

  findRefreshTokenByHash(tokenHash) {
    return (
      this.database
        .getSnapshot()
        .refreshTokens.find((token) => token.tokenHash === tokenHash) ?? null
    );
  }

  async revokeRefreshTokenById(tokenId, metadata = {}) {
    return this.database.mutate((draft) => {
      const token = draft.refreshTokens.find((item) => item.id === tokenId);
      if (!token || token.revokedAt) {
        return null;
      }

      token.revokedAt = metadata.revokedAt ?? new Date().toISOString();
      token.revokeReason = metadata.revokeReason ?? "manual";
      token.replacedByTokenId = metadata.replacedByTokenId ?? null;
      this.pruneExpired(draft);
      return token;
    });
  }

  async revokeAllRefreshTokensForUser(userId, reason = "security_event") {
    await this.database.mutate((draft) => {
      const revokedAt = new Date().toISOString();
      draft.refreshTokens.forEach((token) => {
        if (token.userId === userId && !token.revokedAt) {
          token.revokedAt = revokedAt;
          token.revokeReason = reason;
          token.replacedByTokenId = null;
        }
      });
      this.pruneExpired(draft);
    });
  }

  listActiveSessionsByUser(userId) {
    return this.database
      .getSnapshot()
      .refreshTokens.filter((token) => {
        if (token.userId !== userId) {
          return false;
        }

        if (token.revokedAt) {
          return false;
        }

        return !isExpired(token.expiresAt);
      })
      .sort((left, right) => {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      })
      .map((token) => ({
        id: token.id,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        ip: token.ip ?? null,
        userAgent: token.userAgent ?? null,
      }));
  }

  async createPasswordResetToken(record) {
    await this.database.mutate((draft) => {
      draft.passwordResetTokens.push(record);
      this.pruneExpired(draft);
    });

    return record;
  }

  findPasswordResetTokenByHash(tokenHash) {
    return (
      this.database
        .getSnapshot()
        .passwordResetTokens.find((token) => token.tokenHash === tokenHash) ??
      null
    );
  }

  async markPasswordResetTokenUsed(tokenId) {
    await this.database.mutate((draft) => {
      const token = draft.passwordResetTokens.find((item) => item.id === tokenId);
      if (token && !token.usedAt) {
        token.usedAt = new Date().toISOString();
      }
      this.pruneExpired(draft);
    });
  }

  async addAuditLog(event) {
    await this.database.mutate((draft) => {
      draft.auditLogs.unshift(event);
      draft.auditLogs = draft.auditLogs.slice(0, 5000);
      this.pruneExpired(draft);
    });

    return event;
  }

  listAuditLogs(filters = {}) {
    const { limit = 50, type, userId } = filters;
    let logs = this.database.getSnapshot().auditLogs;

    if (type) {
      logs = logs.filter((entry) => entry.type === type);
    }

    if (userId) {
      logs = logs.filter((entry) => entry.userId === userId);
    }

    return logs.slice(0, limit);
  }

  getAuthMetrics() {
    const snapshot = this.database.getSnapshot();
    const now = nowTimestamp();
    const windowStart = now - 24 * 60 * 60 * 1000;
    const latestLogin = [...snapshot.users]
      .filter((user) => Boolean(user.lastLoginAt))
      .sort((left, right) => {
        return (
          new Date(right.lastLoginAt).getTime() -
          new Date(left.lastLoginAt).getTime()
        );
      })[0];

    const successEvents = snapshot.auditLogs.filter((event) => {
      if (event.type !== "auth.login.success") {
        return false;
      }

      const eventTime = new Date(event.createdAt).getTime();
      return eventTime >= windowStart && eventTime <= now;
    }).length;

    const failureEvents = snapshot.auditLogs.filter((event) => {
      if (event.type !== "auth.login.failure") {
        return false;
      }

      const eventTime = new Date(event.createdAt).getTime();
      return eventTime >= windowStart && eventTime <= now;
    }).length;

    const activeRefreshTokens = snapshot.refreshTokens.filter((token) => {
      if (token.revokedAt) {
        return false;
      }

      return !isExpired(token.expiresAt);
    }).length;

    return {
      totalUsers: snapshot.users.length,
      activeRefreshTokens,
      loginSuccessLast24h: successEvents,
      loginFailureLast24h: failureEvents,
      latestLogin: latestLogin
        ? {
            userId: latestLogin.id,
            name: latestLogin.name,
            email: latestLogin.email,
            at: latestLogin.lastLoginAt,
          }
        : null,
    };
  }

  pruneExpired(draftState) {
    draftState.refreshTokens = draftState.refreshTokens.filter((token) => {
      if (token.revokedAt) {
        return !isOlderThanDays(token.revokedAt, 30);
      }

      return !isExpired(token.expiresAt);
    });
    draftState.refreshTokens = draftState.refreshTokens.slice(-2000);

    draftState.passwordResetTokens = draftState.passwordResetTokens.filter(
      (token) => {
        if (token.usedAt) {
          return false;
        }

        return !isExpired(token.expiresAt);
      }
    );

    draftState.auditLogs = draftState.auditLogs.slice(0, 5000);
  }
}
