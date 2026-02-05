export function sendSuccess(response, payload, options = {}) {
  const status = options.statusCode ?? 200;

  return response.status(status).json({
    success: true,
    data: payload,
  });
}

export function sendError(response, error, statusCode = 500) {
  return response.status(statusCode).json({
    success: false,
    error,
  });
}
