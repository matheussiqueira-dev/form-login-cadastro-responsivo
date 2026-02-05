export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    isActive: user.isActive,
  };
}
