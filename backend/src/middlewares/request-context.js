import { v4 as uuidv4 } from "uuid";

export function requestContext(request, response, next) {
  const incomingRequestId = request.headers["x-request-id"];
  request.id =
    typeof incomingRequestId === "string" && incomingRequestId.trim().length > 0
      ? incomingRequestId.trim()
      : uuidv4();

  response.setHeader("x-request-id", request.id);
  next();
}
