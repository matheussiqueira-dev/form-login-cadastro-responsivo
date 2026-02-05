export function validate(schema) {
  return (request, _response, next) => {
    const parsed = schema.parse({
      body: request.body,
      params: request.params,
      query: request.query,
      headers: request.headers,
    });

    if (parsed.body) {
      request.body = parsed.body;
    }

    if (parsed.params) {
      request.params = parsed.params;
    }

    if (parsed.query) {
      request.query = parsed.query;
    }

    next();
  };
}
