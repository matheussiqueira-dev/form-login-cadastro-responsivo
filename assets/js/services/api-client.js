export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? 0;
    this.response = options.response ?? null;
  }
}

export class ApiClient {
  constructor(options) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs;
    this.getSession = options.getSession;
    this.saveSession = options.saveSession;
    this.clearSession = options.clearSession;
  }

  async request(options) {
    const {
      path,
      method = "GET",
      auth = false,
      body,
      headers = {},
      retryOnUnauthorized = true,
    } = options;

    const session = this.getSession();
    const requestHeaders = {
      Accept: "application/json",
      ...headers,
    };

    if (body !== undefined) {
      requestHeaders["Content-Type"] = "application/json";
    }

    if (auth) {
      if (!session?.accessToken) {
        throw new ApiError("Sessão inválida. Faça login novamente.", {
          status: 401,
        });
      }

      requestHeaders.Authorization = `Bearer ${session.accessToken}`;
    }

    const response = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const parsed = await this.parseResponse(response);

    if (response.status === 401 && auth && retryOnUnauthorized) {
      const refreshed = await this.tryRefreshSession();
      if (refreshed) {
        return this.request({
          ...options,
          retryOnUnauthorized: false,
        });
      }
    }

    if (!response.ok) {
      throw new ApiError(
        parsed?.error?.message || "Não foi possível concluir a requisição.",
        {
          status: response.status,
          response: parsed,
        }
      );
    }

    return parsed?.data ?? null;
  }

  async fetchWithTimeout(url, init) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === "AbortError") {
        throw new ApiError("Tempo limite da API excedido.", { status: 408 });
      }

      throw new ApiError("Não foi possível conectar ao backend.", { status: 0 });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async parseResponse(response) {
    try {
      return await response.json();
    } catch (_error) {
      return null;
    }
  }

  async tryRefreshSession() {
    const session = this.getSession();
    if (!session?.refreshToken) {
      this.clearSession();
      return false;
    }

    try {
      const refreshedData = await this.request({
        path: "/auth/refresh",
        method: "POST",
        body: {
          refreshToken: session.refreshToken,
        },
        auth: false,
        retryOnUnauthorized: false,
      });

      this.saveSession({
        user: refreshedData.user,
        accessToken: refreshedData.tokens.accessToken,
        refreshToken: refreshedData.tokens.refreshToken,
      });

      return true;
    } catch (_error) {
      this.clearSession();
      return false;
    }
  }
}
