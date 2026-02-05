export class AuthService {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  health() {
    return this.apiClient.request({
      path: "/health",
      method: "GET",
      auth: false,
    });
  }

  register(payload) {
    return this.apiClient.request({
      path: "/auth/register",
      method: "POST",
      body: payload,
      auth: false,
    });
  }

  login(payload) {
    return this.apiClient.request({
      path: "/auth/login",
      method: "POST",
      body: payload,
      auth: false,
    });
  }

  logout(refreshToken) {
    return this.apiClient.request({
      path: "/auth/logout",
      method: "POST",
      body: {
        refreshToken,
      },
      auth: false,
    });
  }

  forgotPassword(payload) {
    return this.apiClient.request({
      path: "/auth/forgot-password",
      method: "POST",
      body: payload,
      auth: false,
    });
  }

  resetPassword(payload) {
    return this.apiClient.request({
      path: "/auth/reset-password",
      method: "POST",
      body: payload,
      auth: false,
    });
  }

  getCurrentUser() {
    return this.apiClient.request({
      path: "/auth/me",
      method: "GET",
      auth: true,
    });
  }

  getMetrics() {
    return this.apiClient.request({
      path: "/auth/metrics",
      method: "GET",
      auth: true,
    });
  }

  updateProfile(payload) {
    return this.apiClient.request({
      path: "/auth/profile",
      method: "PATCH",
      body: payload,
      auth: true,
    });
  }

  changePassword(payload) {
    return this.apiClient.request({
      path: "/auth/change-password",
      method: "POST",
      body: payload,
      auth: true,
    });
  }

  listSessions() {
    return this.apiClient.request({
      path: "/auth/sessions",
      method: "GET",
      auth: true,
    });
  }

  revokeSession(sessionId) {
    return this.apiClient.request({
      path: `/auth/sessions/${sessionId}`,
      method: "DELETE",
      auth: true,
    });
  }

  revokeAllSessions() {
    return this.apiClient.request({
      path: "/auth/sessions",
      method: "DELETE",
      auth: true,
    });
  }

  listAuditLogs(limit = 10) {
    return this.apiClient.request({
      path: `/admin/audit-logs?limit=${limit}`,
      method: "GET",
      auth: true,
    });
  }
}
