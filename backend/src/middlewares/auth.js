import { authService } from "../modules/auth/index.js";
import { AppError, unauthorized, forbidden } from "../core/errors.js";
import { verifyAccessToken } from "../modules/auth/token.service.js";

export async function authenticate(request, _response, next) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw unauthorized("Token de acesso não informado.");
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    const user = await authService.getCurrentUser(payload.sub);

    request.auth = {
      userId: user.id,
      email: user.email,
      roles: user.roles,
    };

    return next();
  } catch (error) {
    if (error instanceof AppError && error.code === "FORBIDDEN") {
      return next(error);
    }

    return next(unauthorized("Token inválido ou expirado."));
  }
}

export function authorizeRoles(...allowedRoles) {
  return (request, _response, next) => {
    const userRoles = request.auth?.roles ?? [];
    const hasPermission = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasPermission) {
      return next(forbidden("Você não possui permissão para este recurso."));
    }

    return next();
  };
}
