const DEFAULT_API_BASE_URL = "http://localhost:3333/api/v1";

function resolveApiBaseUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("api");
    if (fromQuery) {
      return fromQuery.replace(/\/$/, "");
    }

    const fromStorage = window.localStorage.getItem("pulse_api_base_url");
    if (fromStorage) {
      return fromStorage.replace(/\/$/, "");
    }
  } catch (_error) {
    // no-op
  }

  return DEFAULT_API_BASE_URL;
}

export const APP_CONFIG = Object.freeze({
  apiBaseUrl: resolveApiBaseUrl(),
  apiRequestTimeoutMs: 12000,
  authRefreshSkewSeconds: 20,
  demoCredentials: Object.freeze({
    name: "Conta Demo Pulse",
    email: "demo@pulseid.app",
    password: "Demo@2026#Pulse",
  }),
  passwordPolicyText:
    "Mínimo 8 caracteres com letra maiúscula, minúscula, número e símbolo.",
});

export const STORAGE_KEYS = Object.freeze({
  rememberedEmail: "pulse_remembered_email_v3",
  registerDraft: "pulse_register_draft_v3",
  authSession: "pulse_auth_session_v3",
});
