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
    REGISTER_DRAFT: "pulse_id_register_draft_v2",
    AUTH_EVENTS: "pulse_id_auth_events_v2",
  });

  const ATTEMPT_LIMIT = 5;
  const ATTEMPT_LOCK_MS = 2 * 60 * 1000;
  const NETWORK_DELAY_MS = 320;
  const LOCK_HINT_REFRESH_MS = 1000;
  const DEMO_ACCOUNT = Object.freeze({
    name: "Conta Demo Pulse",
    email: "demo@pulseid.app",
    password: "Demo@2026#Pulse",
  });

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
    successRateLabel: document.getElementById("success-rate-label"),
    loginEmail: document.getElementById("login-email"),
    loginPassword: document.getElementById("login-password"),
    rememberMe: document.getElementById("remember-me"),
    loginSubmit: document.getElementById("login-submit"),
    demoAccessBtn: document.getElementById("demo-access-btn"),
    lockHint: document.getElementById("lock-hint"),
    capsLogin: document.getElementById("caps-login"),
    registerName: document.getElementById("register-name"),
    registerEmail: document.getElementById("register-email"),
    registerPassword: document.getElementById("register-password"),
    registerConfirmPassword: document.getElementById(
      "register-confirm-password"
    ),
    registerTerms: document.getElementById("register-terms"),
    registerSubmit: document.getElementById("register-submit"),
    generatePasswordBtn: document.getElementById("generate-password-btn"),
    copyPasswordBtn: document.getElementById("copy-password-btn"),
    capsRegister: document.getElementById("caps-register"),
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
    authEvents: sanitizeAuthEvents(readJSON(STORAGE_KEYS.AUTH_EVENTS, [])),
  };

  let lockHintTimerId = null;

  init();

  function init() {
    bindEvents();
    hydrateRememberedEmail();
    restoreRegisterDraft();
    refreshDashboard();
    setMode(MODE.LOGIN, false);
    updatePasswordStrength("");
    setCopyPasswordState();
    syncLockHint();
    restoreSession();
  }

  function bindEvents() {
    window.addEventListener("beforeunload", stopLockHintTimer);

    els.modeSwitch.addEventListener("click", onModeTabClick);
    els.modeSwitch.addEventListener("keydown", onModeTabKeyDown);

    els.authForm.addEventListener("submit", onFormSubmit);
    els.authForm.addEventListener("input", onFormInput);

    if (els.demoAccessBtn) {
      els.demoAccessBtn.addEventListener("click", handleDemoAccess);
    }

    if (els.generatePasswordBtn) {
      els.generatePasswordBtn.addEventListener("click", handleGeneratePassword);
    }

    if (els.copyPasswordBtn) {
      els.copyPasswordBtn.addEventListener("click", handleCopyPassword);
    }

    els.passwordToggles.forEach((btn) => {
      btn.addEventListener("click", onTogglePassword);
    });

    bindCapsLockHint(els.loginPassword, els.capsLogin);
    bindCapsLockHint(els.registerPassword, els.capsRegister);
    bindCapsLockHint(els.registerConfirmPassword, els.capsRegister);

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
      stopLockHintTimer();
      setLockHint("");
    } else {
      updatePasswordStrength("");
      syncLockHint();
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
      setCopyPasswordState();
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

    if (target.id === "login-email" || target.id === "login-password") {
      syncLockHint();
    }

    if (isRegisterDraftField(target.id)) {
      persistRegisterDraft();
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
      syncLockHint();
      return;
    }

    const lockState = getLockState(payload.email);
    if (lockState.locked) {
      setFieldError(
        "login-password",
        `Muitas tentativas. Aguarde ${lockState.remainingSeconds}s.`
      );
      showFeedback("Conta temporariamente bloqueada por segurança.", "error");
      syncLockHint();
      return;
    }

    await withBusyButton(els.loginSubmit, "Validando...", async () => {
      await delay(NETWORK_DELAY_MS);

      const user = findUserByEmail(payload.email);
      const passwordHash = await hashValue(payload.password);

      if (!user || user.passwordHash !== passwordHash) {
        registerLoginFailure(payload.email);
        trackAuthEvent("failure");

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
        syncLockHint();
        refreshDashboard();
        return;
      }

      clearLoginFailures(payload.email);
      trackAuthEvent("success");
      setLockHint("");
      stopLockHintTimer();
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
      clearRegisterDraft();
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
    stopLockHintTimer();
    setLockHint("");
    setCapsHint(els.capsLogin, "");
    setCapsHint(els.capsRegister, "");
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
    syncLockHint();
    showFeedback("Sessão encerrada com sucesso.", "info");
  }

  function handleSwitchUser() {
    clearSession();
    showAuthForm();
    setMode(MODE.LOGIN, true);
    els.loginPassword.value = "";
    syncLockHint();
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
    } else {
      els.lastLoginLabel.textContent =
        `${extractFirstName(latest.name)} em ${formatDate(latest.lastLoginAt)}`;
    }

    if (els.successRateLabel) {
      els.successRateLabel.textContent = calculateRecentSuccessRateLabel();
    }
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

  async function handleDemoAccess() {
    clearFeedback();
    clearAllFieldErrors();
    setMode(MODE.LOGIN, false);

    await withBusyButton(els.demoAccessBtn, "Preparando demo...", async () => {
      await ensureDemoAccount();
      els.loginEmail.value = DEMO_ACCOUNT.email;
      els.loginPassword.value = DEMO_ACCOUNT.password;
      els.rememberMe.checked = true;
      syncLockHint();
      await submitLogin();
    });
  }

  async function ensureDemoAccount() {
    const alreadyExists = findUserByEmail(DEMO_ACCOUNT.email);
    if (alreadyExists) {
      return alreadyExists;
    }

    const now = new Date().toISOString();
    const demoUser = {
      id: createId(),
      name: DEMO_ACCOUNT.name,
      email: DEMO_ACCOUNT.email,
      passwordHash: await hashValue(DEMO_ACCOUNT.password),
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    };

    state.users.push(demoUser);
    persistUsers();
    refreshDashboard();
    return demoUser;
  }

  function handleGeneratePassword() {
    const generatedPassword = generateSecurePassword(14);
    els.registerPassword.value = generatedPassword;
    els.registerConfirmPassword.value = generatedPassword;
    updatePasswordStrength(generatedPassword);
    validateConfirmPassword();
    setCopyPasswordState();
    persistRegisterDraft();

    showFeedback(
      "Senha forte gerada e preenchida automaticamente no cadastro.",
      "info"
    );
  }

  async function handleCopyPassword() {
    const password = els.registerPassword.value;
    if (!password) {
      return;
    }

    const copied = await copyTextToClipboard(password);
    if (!copied) {
      showFeedback(
        "Não foi possível copiar automaticamente. Copie manualmente.",
        "error"
      );
      return;
    }

    showFeedback("Senha copiada para a área de transferência.", "success");
  }

  function setCopyPasswordState() {
    if (els.copyPasswordBtn) {
      els.copyPasswordBtn.disabled = !els.registerPassword.value;
    }
  }

  function bindCapsLockHint(input, hintNode) {
    if (!input || !hintNode) {
      return;
    }

    const updateHint = (event) => {
      const isEnabled = event.getModifierState("CapsLock");
      setCapsHint(hintNode, isEnabled ? "Caps Lock ativado." : "");
    };

    input.addEventListener("keydown", updateHint);
    input.addEventListener("keyup", updateHint);
    input.addEventListener("blur", () => {
      setCapsHint(hintNode, "");
    });
  }

  function setCapsHint(node, message) {
    if (!node) {
      return;
    }

    node.textContent = message || "";
    node.className = message ? "inline-hint is-warning" : "inline-hint";
  }

  function syncLockHint() {
    if (state.mode !== MODE.LOGIN) {
      stopLockHintTimer();
      setLockHint("");
      return;
    }

    const email = normalizeEmail(els.loginEmail.value);
    if (!email) {
      stopLockHintTimer();
      setLockHint("");
      if (els.loginSubmit && !els.loginSubmit.dataset.busy) {
        els.loginSubmit.disabled = false;
      }
      return;
    }

    const lock = getLockState(email);
    const attemptState = state.attempts[email];
    if (lock.locked) {
      if (els.loginSubmit && !els.loginSubmit.dataset.busy) {
        els.loginSubmit.disabled = true;
      }
      setLockHint(
        `Acesso bloqueado temporariamente. Tente novamente em ${lock.remainingSeconds}s.`,
        "warning"
      );
      startLockHintTimer();
      return;
    }

    if (els.loginSubmit && !els.loginSubmit.dataset.busy) {
      els.loginSubmit.disabled = false;
    }

    stopLockHintTimer();

    const failures = attemptState ? Number(attemptState.failures) || 0 : 0;
    if (failures > 0) {
      const remainingAttempts = Math.max(ATTEMPT_LIMIT - failures, 0);
      setLockHint(
        `Atenção: restam ${remainingAttempts} tentativa(s) antes do bloqueio.`,
        "info"
      );
      return;
    }

    setLockHint("");
  }

  function startLockHintTimer() {
    if (lockHintTimerId) {
      return;
    }

    lockHintTimerId = window.setInterval(() => {
      syncLockHint();
    }, LOCK_HINT_REFRESH_MS);
  }

  function stopLockHintTimer() {
    if (!lockHintTimerId) {
      return;
    }

    window.clearInterval(lockHintTimerId);
    lockHintTimerId = null;
  }

  function setLockHint(message, tone) {
    if (!els.lockHint) {
      return;
    }

    els.lockHint.textContent = message || "";
    els.lockHint.className = message
      ? `inline-hint is-${tone || "info"}`
      : "inline-hint";
  }

  function persistRegisterDraft() {
    const payload = {
      name: normalizeSpaces(els.registerName.value),
      email: normalizeEmail(els.registerEmail.value),
      termsAccepted: Boolean(els.registerTerms.checked),
      updatedAt: new Date().toISOString(),
    };

    saveJSON(STORAGE_KEYS.REGISTER_DRAFT, payload);
  }

  function restoreRegisterDraft() {
    const draft = readJSON(STORAGE_KEYS.REGISTER_DRAFT, null);
    if (!draft || typeof draft !== "object") {
      return;
    }

    if (typeof draft.name === "string") {
      els.registerName.value = draft.name;
    }
    if (typeof draft.email === "string") {
      els.registerEmail.value = draft.email;
    }
    els.registerTerms.checked = Boolean(draft.termsAccepted);
  }

  function clearRegisterDraft() {
    safeRemoveItem(STORAGE_KEYS.REGISTER_DRAFT);
  }

  function isRegisterDraftField(fieldId) {
    return (
      fieldId === "register-name" ||
      fieldId === "register-email" ||
      fieldId === "register-terms"
    );
  }

  function trackAuthEvent(type) {
    state.authEvents.unshift({
      id: createId(),
      type,
      at: new Date().toISOString(),
    });

    state.authEvents = state.authEvents.slice(0, 200);
    persistAuthEvents();
  }

  function persistAuthEvents() {
    saveJSON(STORAGE_KEYS.AUTH_EVENTS, state.authEvents);
  }

  function calculateRecentSuccessRateLabel() {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const recentEvents = state.authEvents.filter((eventItem) => {
      const timestamp = new Date(eventItem.at).getTime();
      return timestamp >= dayAgo && timestamp <= now;
    });

    if (!recentEvents.length) {
      return "Sem dados";
    }

    const successCount = recentEvents.filter(
      (eventItem) => eventItem.type === "success"
    ).length;

    const successRate = Math.round((successCount / recentEvents.length) * 100);
    return `${successRate}% (${recentEvents.length} tentativa(s))`;
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
    setCopyPasswordState();
    setCapsHint(els.capsRegister, "");
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
    button.dataset.busy = "true";
    button.textContent = loadingLabel;

    try {
      await callback();
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
      button.removeAttribute("data-busy");
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

  function sanitizeAuthEvents(rawEvents) {
    if (!Array.isArray(rawEvents)) {
      return [];
    }

    return rawEvents
      .filter(
        (eventItem) =>
          eventItem &&
          typeof eventItem.at === "string" &&
          (eventItem.type === "success" || eventItem.type === "failure")
      )
      .map((eventItem) => ({
        id: typeof eventItem.id === "string" ? eventItem.id : createId(),
        type: eventItem.type,
        at: eventItem.at,
      }));
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

  function generateSecurePassword(length) {
    const targetLength = Math.max(10, Number(length) || 14);
    const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowercase = "abcdefghijkmnopqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "!@#$%*()-_=+?";
    const charset = `${uppercase}${lowercase}${numbers}${symbols}`;

    const requiredChars = [
      pickRandomChar(uppercase),
      pickRandomChar(lowercase),
      pickRandomChar(numbers),
      pickRandomChar(symbols),
    ];

    while (requiredChars.length < targetLength) {
      requiredChars.push(pickRandomChar(charset));
    }

    return shuffleArray(requiredChars).join("");
  }

  async function copyTextToClipboard(text) {
    if (!text) {
      return false;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_error) {
      // fallback abaixo.
    }

    try {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "readonly");
      helper.style.position = "absolute";
      helper.style.left = "-9999px";
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(helper);
      return copied;
    } catch (_error) {
      return false;
    }
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

  function pickRandomChar(charset) {
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return charset[array[0] % charset.length];
    }

    return charset[Math.floor(Math.random() * charset.length)];
  }

  function shuffleArray(items) {
    const copiedItems = [...items];

    for (let index = copiedItems.length - 1; index > 0; index -= 1) {
      const randomIndex = window.crypto && window.crypto.getRandomValues
        ? getRandomInt(index + 1)
        : Math.floor(Math.random() * (index + 1));
      [copiedItems[index], copiedItems[randomIndex]] = [
        copiedItems[randomIndex],
        copiedItems[index],
      ];
    }

    return copiedItems;
  }

  function getRandomInt(maxExclusive) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % maxExclusive;
  }

  function delay(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }
})();
