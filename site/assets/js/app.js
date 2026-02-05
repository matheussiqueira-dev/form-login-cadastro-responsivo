(() => {
  "use strict";

  const MODE = Object.freeze({
    LOGIN: "login",
    REGISTER: "register",
  });

  const STORAGE_KEYS = Object.freeze({
    USERS: "pulse_id_users_v2",
    SESSION: "pulse_id_session_v2",
    REMEMBERED_EMAIL: "pulse_id_remembered_email_v2",
    ATTEMPTS: "pulse_id_attempts_v2",
    RESET_REQUESTS: "pulse_id_reset_requests_v2",
  });

  const ATTEMPT_LIMIT = 5;
  const ATTEMPT_LOCK_MS = 2 * 60 * 1000;
  const NETWORK_DELAY_MS = 320;

  const els = {
    modeSwitch: document.getElementById("mode-switch"),
    tabLogin: document.getElementById("tab-login"),
    tabRegister: document.getElementById("tab-register"),
    panelLogin: document.getElementById("panel-login"),
    panelRegister: document.getElementById("panel-register"),
    authForm: document.getElementById("auth-form"),
    feedback: document.getElementById("feedback"),
    usersCount: document.getElementById("users-count"),
    lastLoginLabel: document.getElementById("last-login-label"),
    loginEmail: document.getElementById("login-email"),
    loginPassword: document.getElementById("login-password"),
    rememberMe: document.getElementById("remember-me"),
    loginSubmit: document.getElementById("login-submit"),
    registerName: document.getElementById("register-name"),
    registerEmail: document.getElementById("register-email"),
    registerPassword: document.getElementById("register-password"),
    registerConfirmPassword: document.getElementById(
      "register-confirm-password"
    ),
    registerTerms: document.getElementById("register-terms"),
    registerSubmit: document.getElementById("register-submit"),
    strengthBar: document.getElementById("strength-bar"),
    strengthLabel: document.getElementById("strength-label"),
    requirementItems: document.querySelectorAll("#password-requirements li"),
    forgotPasswordTrigger: document.getElementById("forgot-password-trigger"),
    resetDialog: document.getElementById("reset-dialog"),
    resetForm: document.getElementById("reset-form"),
    resetEmail: document.getElementById("reset-email"),
    sendResetBtn: document.getElementById("send-reset-btn"),
    closeDialogBtn: document.querySelector("[data-close-dialog]"),
    sessionCard: document.getElementById("session-card"),
    sessionMessage: document.getElementById("session-message"),
    logoutBtn: document.getElementById("logout-btn"),
    switchUserBtn: document.getElementById("switch-user-btn"),
    passwordToggles: document.querySelectorAll(".toggle-password"),
  };

  if (!els.authForm || !els.modeSwitch) {
    return;
  }

  const state = {
    mode: MODE.LOGIN,
    users: sanitizeUsers(readJSON(STORAGE_KEYS.USERS, [])),
    attempts: sanitizeAttempts(readJSON(STORAGE_KEYS.ATTEMPTS, {})),
    session: readJSON(STORAGE_KEYS.SESSION, null),
  };

  init();

  function init() {
    bindEvents();
    hydrateRememberedEmail();
    refreshDashboard();
    setMode(MODE.LOGIN, false);
    updatePasswordStrength("");
    restoreSession();
  }

  function bindEvents() {
    els.modeSwitch.addEventListener("click", onModeTabClick);
    els.modeSwitch.addEventListener("keydown", onModeTabKeyDown);

    els.authForm.addEventListener("submit", onFormSubmit);
    els.authForm.addEventListener("input", onFormInput);

    els.passwordToggles.forEach((btn) => {
      btn.addEventListener("click", onTogglePassword);
    });

    els.forgotPasswordTrigger.addEventListener("click", openResetDialog);
    els.resetForm.addEventListener("submit", onResetSubmit);

    if (els.closeDialogBtn) {
      els.closeDialogBtn.addEventListener("click", closeResetDialog);
    }

    if (els.resetDialog) {
      els.resetDialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeResetDialog();
      });

      els.resetDialog.addEventListener("click", (event) => {
        const dialogRect = els.resetDialog.getBoundingClientRect();
        const isInDialog =
          event.clientX >= dialogRect.left &&
          event.clientX <= dialogRect.right &&
          event.clientY >= dialogRect.top &&
          event.clientY <= dialogRect.bottom;

        if (!isInDialog) {
          closeResetDialog();
        }
      });
    }

    els.logoutBtn.addEventListener("click", handleLogout);
    els.switchUserBtn.addEventListener("click", handleSwitchUser);
  }

  function onModeTabClick(event) {
    const tab = event.target.closest(".mode-tab");
    if (!tab) {
      return;
    }

    setMode(tab.dataset.mode, true);
  }

  function onModeTabKeyDown(event) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }

    const tabs = [els.tabLogin, els.tabRegister];
    const activeIndex = tabs.findIndex(
      (tab) => tab.getAttribute("aria-selected") === "true"
    );

    const nextIndex =
      event.key === "ArrowRight"
        ? (activeIndex + 1) % tabs.length
        : (activeIndex - 1 + tabs.length) % tabs.length;

    event.preventDefault();
    tabs[nextIndex].focus();
    setMode(tabs[nextIndex].dataset.mode, false);
  }

  function setMode(nextMode, focusFirstField) {
    if (nextMode !== MODE.LOGIN && nextMode !== MODE.REGISTER) {
      return;
    }

    state.mode = nextMode;
    const isLogin = nextMode === MODE.LOGIN;

    els.tabLogin.setAttribute("aria-selected", String(isLogin));
    els.tabRegister.setAttribute("aria-selected", String(!isLogin));
    els.tabLogin.tabIndex = isLogin ? 0 : -1;
    els.tabRegister.tabIndex = isLogin ? -1 : 0;

    els.modeSwitch.style.setProperty(
      "--indicator-offset",
      isLogin ? "0%" : "calc(100% + 0.33rem)"
    );

    togglePanel(els.panelLogin, isLogin);
    togglePanel(els.panelRegister, !isLogin);

    configureRequiredAttributes(isLogin);
    clearAllFieldErrors();
    clearFeedback();

    if (!isLogin) {
      updatePasswordStrength(els.registerPassword.value);
    } else {
      updatePasswordStrength("");
    }

    if (focusFirstField && !isSessionVisible()) {
      const target = isLogin ? els.loginEmail : els.registerName;
      if (target) {
        target.focus();
      }
    }
  }

  function togglePanel(panel, shouldShow) {
    panel.hidden = !shouldShow;
    panel.classList.toggle("is-active", shouldShow);
  }

  function configureRequiredAttributes(isLogin) {
    els.loginEmail.required = isLogin;
    els.loginPassword.required = isLogin;

    els.registerName.required = !isLogin;
    els.registerEmail.required = !isLogin;
    els.registerPassword.required = !isLogin;
    els.registerConfirmPassword.required = !isLogin;
    els.registerTerms.required = !isLogin;
  }

  function onFormInput(event) {
    const target = event.target;
    if (!target || !target.id) {
      return;
    }

    clearFieldError(target.id);
    clearFeedback();

    if (target.id === "register-password") {
      updatePasswordStrength(target.value);
      if (els.registerConfirmPassword.value.length > 0) {
        validateConfirmPassword();
      }
    }

    if (target.id === "register-confirm-password") {
      validateConfirmPassword();
    }

    if (target.id === "register-terms" && els.registerTerms.checked) {
      clearFieldError("register-terms");
    }
  }

  async function onFormSubmit(event) {
    event.preventDefault();

    if (state.mode === MODE.LOGIN) {
      await submitLogin();
      return;
    }

    await submitRegister();
  }

  async function submitLogin() {
    clearAllFieldErrors();
    clearFeedback();

    const payload = {
      email: normalizeEmail(els.loginEmail.value),
      password: els.loginPassword.value,
      rememberEmail: els.rememberMe.checked,
    };

    const errors = validateLoginPayload(payload);
    if (Object.keys(errors).length > 0) {
      applyErrors(errors);
      showFeedback("Revise os dados de login antes de continuar.", "error");
      return;
    }

    const lockState = getLockState(payload.email);
    if (lockState.locked) {
      setFieldError(
        "login-password",
        `Muitas tentativas. Aguarde ${lockState.remainingSeconds}s.`
      );
      showFeedback("Conta temporariamente bloqueada por segurança.", "error");
      return;
    }

    await withBusyButton(els.loginSubmit, "Validando...", async () => {
      await delay(NETWORK_DELAY_MS);

      const user = findUserByEmail(payload.email);
      const passwordHash = await hashValue(payload.password);

      if (!user || user.passwordHash !== passwordHash) {
        registerLoginFailure(payload.email);

        const updatedLockState = getLockState(payload.email);
        if (updatedLockState.locked) {
          setFieldError(
            "login-password",
            `Bloqueio ativo por ${Math.ceil(
              ATTEMPT_LOCK_MS / 60000
            )} minutos.`
          );
        } else {
          setFieldError("login-password", "Credenciais inválidas.");
        }

        showFeedback("Não foi possível autenticar com os dados informados.", "error");
        return;
      }

      clearLoginFailures(payload.email);
      finalizeLogin(user, payload.rememberEmail);
      els.loginPassword.value = "";

      showFeedback(
        `Acesso liberado. Bem-vindo, ${extractFirstName(user.name)}.`,
        "success"
      );
    });
  }

  async function submitRegister() {
    clearAllFieldErrors();
    clearFeedback();

    const payload = {
      name: normalizeSpaces(els.registerName.value),
      email: normalizeEmail(els.registerEmail.value),
      password: els.registerPassword.value,
      confirmPassword: els.registerConfirmPassword.value,
      termsAccepted: els.registerTerms.checked,
    };

    const errors = validateRegisterPayload(payload);
    if (Object.keys(errors).length > 0) {
      applyErrors(errors);
      showFeedback("Existem campos de cadastro que precisam de ajustes.", "error");
      return;
    }

    if (findUserByEmail(payload.email)) {
      setFieldError("register-email", "Já existe uma conta com este e-mail.");
      showFeedback("Use outro e-mail ou faça login na conta existente.", "error");
      return;
    }

    await withBusyButton(els.registerSubmit, "Criando conta...", async () => {
      await delay(NETWORK_DELAY_MS);

      const now = new Date().toISOString();
      const newUser = {
        id: createId(),
        name: payload.name,
        email: payload.email,
        passwordHash: await hashValue(payload.password),
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
      };

      state.users.push(newUser);
      persistUsers();
      refreshDashboard();

      els.loginEmail.value = payload.email;
      resetRegisterFields();
      setMode(MODE.LOGIN, false);
      els.loginEmail.focus();

      showFeedback("Conta criada com sucesso. Faça login para continuar.", "success");
    });
  }

  function validateLoginPayload(payload) {
    const errors = {};

    if (!isValidEmail(payload.email)) {
      errors["login-email"] = "Informe um e-mail válido.";
    }

    if (!payload.password || payload.password.length < 8) {
      errors["login-password"] = "A senha deve ter pelo menos 8 caracteres.";
    }

    return errors;
  }

  function validateRegisterPayload(payload) {
    const errors = {};

    if (!payload.name || payload.name.length < 3) {
      errors["register-name"] = "Informe nome completo com ao menos 3 caracteres.";
    }

    if (payload.name.length > 70) {
      errors["register-name"] = "Use no máximo 70 caracteres para o nome.";
    }

    if (!isValidEmail(payload.email)) {
      errors["register-email"] = "Informe um e-mail válido para cadastro.";
    }

    const strength = evaluatePasswordStrength(payload.password);
    const hasRequiredStrength =
      strength.rules.length &&
      strength.rules.letterCase &&
      strength.rules.number &&
      strength.rules.symbol;

    if (!hasRequiredStrength) {
      errors["register-password"] =
        "Use no mínimo 8 caracteres com letras maiúsculas, minúsculas, número e símbolo.";
    }

    if (payload.confirmPassword !== payload.password) {
      errors["register-confirm-password"] = "As senhas informadas não coincidem.";
    }

    if (!payload.termsAccepted) {
      errors["register-terms"] = "Você precisa aceitar os termos para continuar.";
    }

    return errors;
  }

  function validateConfirmPassword() {
    const confirmValue = els.registerConfirmPassword.value;
    if (!confirmValue) {
      clearFieldError("register-confirm-password");
      return true;
    }

    if (confirmValue !== els.registerPassword.value) {
      setFieldError("register-confirm-password", "As senhas não coincidem.");
      return false;
    }

    clearFieldError("register-confirm-password");
    return true;
  }

  function updatePasswordStrength(password) {
    const strength = evaluatePasswordStrength(password);
    const levels = ["is-weak", "is-medium", "is-good", "is-strong"];

    els.strengthBar.classList.remove(...levels);
    if (strength.levelClass) {
      els.strengthBar.classList.add(strength.levelClass);
    }

    els.strengthBar.style.width = `${strength.width}%`;
    els.strengthLabel.textContent = `Força da senha: ${strength.label}.`;

    els.requirementItems.forEach((item) => {
      const ruleName = item.dataset.rule;
      item.classList.toggle("is-valid", Boolean(strength.rules[ruleName]));
    });
  }

  function evaluatePasswordStrength(password) {
    const rules = {
      length: password.length >= 8,
      letterCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
      number: /\d/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password),
    };

    let score = Object.values(rules).filter(Boolean).length;
    if (password.length >= 12 && score >= 3) {
      score += 1;
    }

    if (!password) {
      return {
        label: "não avaliada",
        width: 0,
        levelClass: "",
        rules,
      };
    }

    if (score <= 1) {
      return {
        label: "fraca",
        width: 25,
        levelClass: "is-weak",
        rules,
      };
    }

    if (score <= 2) {
      return {
        label: "média",
        width: 50,
        levelClass: "is-medium",
        rules,
      };
    }

    if (score <= 3) {
      return {
        label: "boa",
        width: 72,
        levelClass: "is-good",
        rules,
      };
    }

    return {
      label: "forte",
      width: 100,
      levelClass: "is-strong",
      rules,
    };
  }

  function finalizeLogin(user, rememberEmail) {
    if (rememberEmail) {
      safeSetItem(STORAGE_KEYS.REMEMBERED_EMAIL, user.email);
    } else {
      safeRemoveItem(STORAGE_KEYS.REMEMBERED_EMAIL);
    }

    const now = new Date().toISOString();
    user.lastLoginAt = now;
    user.updatedAt = now;
    persistUsers();

    state.session = {
      userId: user.id,
      token: createToken(16),
      createdAt: now,
    };
    saveJSON(STORAGE_KEYS.SESSION, state.session);

    refreshDashboard();
    renderSession(user);
  }

  function restoreSession() {
    if (!state.session || !state.session.userId) {
      return;
    }

    const user = state.users.find((candidate) => candidate.id === state.session.userId);
    if (!user) {
      clearSession();
      return;
    }

    renderSession(user);
    showFeedback(
      `Sessão restaurada para ${extractFirstName(user.name)}.`,
      "info"
    );
  }

  function renderSession(user) {
    els.modeSwitch.hidden = true;
    els.authForm.hidden = true;
    els.sessionCard.hidden = false;
    els.sessionMessage.textContent =
      `Conta ${user.email} autenticada em ${formatDate(user.lastLoginAt || new Date().toISOString())}.`;
  }

  function isSessionVisible() {
    return !els.sessionCard.hidden;
  }

  function showAuthForm() {
    els.sessionCard.hidden = true;
    els.modeSwitch.hidden = false;
    els.authForm.hidden = false;
  }

  function handleLogout() {
    clearSession();
    showAuthForm();
    setMode(MODE.LOGIN, false);
    showFeedback("Sessão encerrada com sucesso.", "info");
  }

  function handleSwitchUser() {
    clearSession();
    showAuthForm();
    setMode(MODE.LOGIN, true);
    els.loginPassword.value = "";
    showFeedback("Selecione outra conta para iniciar uma nova sessão.", "info");
  }

  function clearSession() {
    state.session = null;
    safeRemoveItem(STORAGE_KEYS.SESSION);
  }

  function refreshDashboard() {
    els.usersCount.textContent = String(state.users.length);

    const latest = [...state.users]
      .filter((user) => Boolean(user.lastLoginAt))
      .sort((a, b) => new Date(b.lastLoginAt) - new Date(a.lastLoginAt))[0];

    if (!latest) {
      els.lastLoginLabel.textContent = "Ainda sem registros";
      return;
    }

    els.lastLoginLabel.textContent =
      `${extractFirstName(latest.name)} em ${formatDate(latest.lastLoginAt)}`;
  }

  function onTogglePassword(event) {
    const button = event.currentTarget;
    const targetId = button.dataset.target;
    const field = document.getElementById(targetId);

    if (!field) {
      return;
    }

    const nextType = field.type === "password" ? "text" : "password";
    field.type = nextType;

    const isVisible = nextType === "text";
    button.textContent = isVisible ? "Ocultar" : "Mostrar";
    button.setAttribute(
      "aria-label",
      isVisible ? "Ocultar senha" : "Mostrar senha"
    );
  }

  function openResetDialog() {
    clearFieldError("reset-email");

    if (typeof els.resetDialog.showModal === "function") {
      els.resetDialog.showModal();
    } else {
      els.resetDialog.setAttribute("open", "open");
    }

    setTimeout(() => {
      els.resetEmail.focus();
    }, 0);
  }

  function closeResetDialog() {
    if (typeof els.resetDialog.close === "function" && els.resetDialog.open) {
      els.resetDialog.close();
      return;
    }

    els.resetDialog.removeAttribute("open");
  }

  async function onResetSubmit(event) {
    event.preventDefault();

    clearFieldError("reset-email");
    const email = normalizeEmail(els.resetEmail.value);

    if (!isValidEmail(email)) {
      setFieldError("reset-email", "Informe um e-mail válido.");
      return;
    }

    await withBusyButton(els.sendResetBtn, "Enviando...", async () => {
      await delay(NETWORK_DELAY_MS);

      const userExists = Boolean(findUserByEmail(email));
      if (userExists) {
        const history = readJSON(STORAGE_KEYS.RESET_REQUESTS, []);
        history.unshift({
          id: createId(),
          email,
          token: createToken(8),
          requestedAt: new Date().toISOString(),
        });
        saveJSON(STORAGE_KEYS.RESET_REQUESTS, history.slice(0, 15));
      }

      closeResetDialog();
      els.resetForm.reset();

      showFeedback(
        `Se ${maskEmail(email)} existir na base, um link de recuperação foi enviado (simulação).`,
        "info"
      );
    });
  }

  function findUserByEmail(email) {
    return state.users.find((user) => user.email === email) || null;
  }

  function registerLoginFailure(email) {
    const now = Date.now();
    const current = state.attempts[email] || { failures: 0, lockUntil: 0 };

    if (current.lockUntil && current.lockUntil < now) {
      current.failures = 0;
      current.lockUntil = 0;
    }

    current.failures += 1;

    if (current.failures >= ATTEMPT_LIMIT) {
      current.failures = 0;
      current.lockUntil = now + ATTEMPT_LOCK_MS;
    }

    state.attempts[email] = current;
    persistAttempts();
  }

  function clearLoginFailures(email) {
    if (state.attempts[email]) {
      delete state.attempts[email];
      persistAttempts();
    }
  }

  function getLockState(email) {
    const current = state.attempts[email];
    if (!current || !current.lockUntil) {
      return { locked: false, remainingSeconds: 0 };
    }

    const remainingMs = current.lockUntil - Date.now();
    if (remainingMs <= 0) {
      delete state.attempts[email];
      persistAttempts();
      return { locked: false, remainingSeconds: 0 };
    }

    return {
      locked: true,
      remainingSeconds: Math.ceil(remainingMs / 1000),
    };
  }

  function persistUsers() {
    saveJSON(STORAGE_KEYS.USERS, state.users);
  }

  function persistAttempts() {
    saveJSON(STORAGE_KEYS.ATTEMPTS, state.attempts);
  }

  function hydrateRememberedEmail() {
    const rememberedEmail = safeGetItem(STORAGE_KEYS.REMEMBERED_EMAIL);
    if (!rememberedEmail) {
      return;
    }

    els.loginEmail.value = rememberedEmail;
    els.rememberMe.checked = true;
  }

  function resetRegisterFields() {
    els.registerName.value = "";
    els.registerEmail.value = "";
    els.registerPassword.value = "";
    els.registerConfirmPassword.value = "";
    els.registerTerms.checked = false;
    updatePasswordStrength("");
  }

  function setFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(`error-${fieldId}`);

    if (error) {
      error.textContent = message || "";
    }

    if (field) {
      field.setAttribute("aria-invalid", message ? "true" : "false");
    }
  }

  function clearFieldError(fieldId) {
    setFieldError(fieldId, "");
  }

  function clearAllFieldErrors() {
    document.querySelectorAll(".field-error").forEach((node) => {
      node.textContent = "";
    });

    document.querySelectorAll("input").forEach((node) => {
      const fieldId = node.id || "";
      const shouldReset =
        fieldId.startsWith("register-") ||
        fieldId.startsWith("login-") ||
        fieldId === "reset-email";

      if (shouldReset) {
        node.setAttribute("aria-invalid", "false");
      }
    });
  }

  function applyErrors(errors) {
    Object.entries(errors).forEach(([fieldId, message]) => {
      setFieldError(fieldId, message);
    });
  }

  function showFeedback(message, tone) {
    els.feedback.textContent = message;
    els.feedback.className = `feedback is-visible is-${tone}`;
  }

  function clearFeedback() {
    els.feedback.textContent = "";
    els.feedback.className = "feedback";
  }

  async function withBusyButton(button, loadingLabel, callback) {
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = loadingLabel;

    try {
      await callback();
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  function sanitizeUsers(rawUsers) {
    if (!Array.isArray(rawUsers)) {
      return [];
    }

    return rawUsers
      .filter(
        (user) =>
          user &&
          typeof user.id === "string" &&
          typeof user.name === "string" &&
          typeof user.email === "string" &&
          typeof user.passwordHash === "string"
      )
      .map((user) => ({
        ...user,
        name: normalizeSpaces(user.name),
        email: normalizeEmail(user.email),
      }));
  }

  function sanitizeAttempts(rawAttempts) {
    if (!rawAttempts || typeof rawAttempts !== "object") {
      return {};
    }

    const normalized = {};
    Object.entries(rawAttempts).forEach(([email, value]) => {
      if (!value || typeof value !== "object") {
        return;
      }

      normalized[normalizeEmail(email)] = {
        failures: Number(value.failures) || 0,
        lockUntil: Number(value.lockUntil) || 0,
      };
    });

    return normalized;
  }

  function readJSON(key, fallbackValue) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return fallbackValue;
      }

      return JSON.parse(raw);
    } catch (_error) {
      return fallbackValue;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function safeGetItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function safeSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_error) {
      // localStorage pode estar indisponível por política do navegador.
    }
  }

  function safeRemoveItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (_error) {
      // localStorage pode estar indisponível por política do navegador.
    }
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeSpaces(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function extractFirstName(name) {
    return normalizeSpaces(name).split(" ")[0] || "usuário";
  }

  function formatDate(isoDate) {
    if (!isoDate) {
      return "agora";
    }

    const parsedDate = new Date(isoDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return "agora";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(parsedDate);
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `id-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  function createToken(bytesLength) {
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(bytesLength);
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
        ""
      );
    }

    return `${Date.now()}${Math.random().toString(16).slice(2)}`;
  }

  async function hashValue(value) {
    const normalized = String(value || "");

    try {
      if (window.crypto && window.crypto.subtle) {
        const encoded = new TextEncoder().encode(normalized);
        const digest = await window.crypto.subtle.digest("SHA-256", encoded);
        return Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, "0")
        ).join("");
      }
    } catch (_error) {
      // fallback abaixo para navegadores sem Web Crypto.
    }

    return btoa(unescape(encodeURIComponent(normalized)));
  }

  function maskEmail(email) {
    const [namePart, domainPart] = email.split("@");
    if (!namePart || !domainPart) {
      return email;
    }

    const visibleStart = namePart.slice(0, 2);
    const visibleEnd = domainPart.slice(-4);
    return `${visibleStart}***@***${visibleEnd}`;
  }

  function delay(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }
})();
