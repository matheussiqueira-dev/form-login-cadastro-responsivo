import { ZodError } from "zod";
import { AppError } from "../core/errors.js";
import { logger } from "../core/logger.js";

export function errorHandler(error, request, response, _next) {
  if (error instanceof ZodError) {
    return response.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados inválidos na requisição.",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }

  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  logger.error(
    {
      requestId: request.id,
      path: request.originalUrl,
      method: request.method,
      err: error,
    },
    "Unhandled error"
  );

  return response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Erro interno inesperado.",
    },
  });
}
