export class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "INTERNAL_ERROR";
    this.details = options.details ?? null;
    this.isOperational = options.isOperational ?? true;
  }
}

export function badRequest(message, details) {
  return new AppError(message, {
    statusCode: 400,
    code: "BAD_REQUEST",
    details,
  });
}

export function unauthorized(message = "Não autenticado") {
  return new AppError(message, {
    statusCode: 401,
    code: "UNAUTHORIZED",
  });
}

export function forbidden(message = "Acesso negado") {
  return new AppError(message, {
    statusCode: 403,
    code: "FORBIDDEN",
  });
}

export function notFound(message = "Recurso não encontrado") {
  return new AppError(message, {
    statusCode: 404,
    code: "NOT_FOUND",
  });
}

export function conflict(message = "Conflito de dados") {
  return new AppError(message, {
    statusCode: 409,
    code: "CONFLICT",
  });
}

export function tooManyRequests(message = "Muitas requisições") {
  return new AppError(message, {
    statusCode: 429,
    code: "RATE_LIMITED",
  });
}
