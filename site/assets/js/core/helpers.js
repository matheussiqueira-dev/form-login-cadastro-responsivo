export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(value));
}

export function extractFirstName(name) {
  const normalized = normalizeSpaces(name);
  return normalized.split(" ")[0] || "usuário";
}

export function formatDate(isoDate) {
  if (!isoDate) {
    return "agora";
  }

  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return "agora";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

export function maskEmail(email) {
  const [namePart, domainPart] = String(email || "").split("@");
  if (!namePart || !domainPart) {
    return email;
  }

  const visibleStart = namePart.slice(0, 2);
  const visibleEnd = domainPart.slice(-4);
  return `${visibleStart}***@***${visibleEnd}`;
}

export function parseApiError(error, fallbackMessage) {
  if (error && typeof error === "object") {
    if (typeof error.message === "string" && error.message.length > 0) {
      return error.message;
    }

    if (
      error.response &&
      error.response.error &&
      typeof error.response.error.message === "string"
    ) {
      return error.response.error.message;
    }
  }

  return fallbackMessage;
}
