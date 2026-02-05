import { sendSuccess } from "../../core/http-response.js";
import { authService } from "../auth/index.js";

export const auditController = {
  list(request, response) {
    const logs = authService.getAuditLogs(request.query);
    return sendSuccess(response, {
      items: logs,
      total: logs.length,
    });
  },
};
