import rateLimit from "express-rate-limit";
import { tooManyRequests } from "../core/errors.js";

const buildHandler = () =>
  (_request, _response, next, options) =>
    next(
      tooManyRequests(
        options.message || "Limite de requisições excedido. Tente novamente mais tarde."
      )
    );

export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 180,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildHandler(),
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildHandler(),
});
