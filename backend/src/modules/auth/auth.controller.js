import { sendSuccess } from "../../core/http-response.js";
import { authService } from "./index.js";

function requestMeta(request) {
  return {
    ip: request.ip,
    userAgent: request.get("user-agent") ?? null,
    requestId: request.id,
  };
}

export const authController = {
  async register(request, response) {
    const payload = await authService.register(request.body, requestMeta(request));
    return sendSuccess(response, payload, { statusCode: 201 });
  },

  async login(request, response) {
    const payload = await authService.login(request.body, requestMeta(request));
    return sendSuccess(response, payload);
  },

  async refresh(request, response) {
    const payload = await authService.refresh(request.body, requestMeta(request));
    return sendSuccess(response, payload);
  },

  async logout(request, response) {
    const payload = await authService.logout(request.body, requestMeta(request));
    return sendSuccess(response, payload);
  },

  async forgotPassword(request, response) {
    const payload = await authService.forgotPassword(
      request.body,
      requestMeta(request)
    );
    return sendSuccess(response, payload, { statusCode: 202 });
  },

  async resetPassword(request, response) {
    const payload = await authService.resetPassword(request.body, requestMeta(request));
    return sendSuccess(response, payload);
  },

  async me(request, response) {
    const user = await authService.getCurrentUser(request.auth.userId);
    return sendSuccess(response, { user });
  },

  async updateProfile(request, response) {
    const payload = await authService.updateProfile(
      request.auth.userId,
      request.body,
      requestMeta(request)
    );
    return sendSuccess(response, payload);
  },

  async changePassword(request, response) {
    const payload = await authService.changePassword(
      request.auth.userId,
      request.body,
      requestMeta(request)
    );
    return sendSuccess(response, payload);
  },

  async sessions(request, response) {
    const sessions = authService.listSessions(request.auth.userId);
    return sendSuccess(response, {
      items: sessions,
      total: sessions.length,
    });
  },

  async revokeSession(request, response) {
    const payload = await authService.revokeSession(
      request.auth.userId,
      request.params.sessionId,
      requestMeta(request)
    );
    return sendSuccess(response, payload);
  },

  async revokeAllSessions(request, response) {
    const payload = await authService.revokeAllSessions(
      request.auth.userId,
      requestMeta(request)
    );
    return sendSuccess(response, payload);
  },

  async metrics(_request, response) {
    const metrics = authService.getMetrics();
    return sendSuccess(response, metrics);
  },
};
