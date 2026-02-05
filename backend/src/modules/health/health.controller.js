import { sendSuccess } from "../../core/http-response.js";
import { authService } from "../auth/index.js";

export const healthController = {
  check(_request, response) {
    const metrics = authService.getMetrics();

    return sendSuccess(response, {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      metrics,
    });
  },
};
