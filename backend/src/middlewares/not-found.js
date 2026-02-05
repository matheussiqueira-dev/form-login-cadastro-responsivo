export function notFoundHandler(request, response) {
  return response.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Rota não encontrada: ${request.method} ${request.originalUrl}`,
    },
  });
}
