import { APP_CONFIG, STORAGE_KEYS } from "./core/config.js";
import { extractFirstName, formatDate, isValidEmail, normalizeEmail, normalizeSpaces, parseApiError } from "./core/helpers.js";
import { storage } from "./core/storage.js";
import { AuthService } from "./services/auth-service.js";
import { ApiClient } from "./services/api-client.js";
import { copyTextToClipboard, evaluatePasswordStrength, generateSecurePassword, validateStrongPassword } from "./services/password-tools.js";

const MODE = Object.freeze({ LOGIN: "login", REGISTER: "register" });
const state = { mode: MODE.LOGIN, session: storage.readJson(STORAGE_KEYS.authSession, null), currentUser: null };
const els = {
  modeSwitch: document.getElementById("mode-switch"), tabLogin: document.getElementById("tab-login"), tabRegister: document.getElementById("tab-register"), panelLogin: document.getElementById("panel-login"), panelRegister: document.getElementById("panel-register"), authForm: document.getElementById("auth-form"), feedback: document.getElementById("feedback"), usersCount: document.getElementById("users-count"), lastLoginLabel: document.getElementById("last-login-label"), successRateLabel: document.getElementById("success-rate-label"), backendStatusLabel: document.getElementById("backend-status-label"),
  loginEmail: document.getElementById("login-email"), loginPassword: document.getElementById("login-password"), rememberMe: document.getElementById("remember-me"), loginSubmit: document.getElementById("login-submit"), demoAccessBtn: document.getElementById("demo-access-btn"), lockHint: document.getElementById("lock-hint"), capsLogin: document.getElementById("caps-login"),
  registerName: document.getElementById("register-name"), registerEmail: document.getElementById("register-email"), registerPassword: document.getElementById("register-password"), registerConfirmPassword: document.getElementById("register-confirm-password"), registerTerms: document.getElementById("register-terms"), registerSubmit: document.getElementById("register-submit"), generatePasswordBtn: document.getElementById("generate-password-btn"), copyPasswordBtn: document.getElementById("copy-password-btn"), capsRegister: document.getElementById("caps-register"), strengthBar: document.getElementById("strength-bar"), strengthLabel: document.getElementById("strength-label"), requirementItems: document.querySelectorAll("#password-requirements li"),
  forgotPasswordTrigger: document.getElementById("forgot-password-trigger"), resetDialog: document.getElementById("reset-dialog"), resetForm: document.getElementById("reset-form"), resetEmail: document.getElementById("reset-email"), resetToken: document.getElementById("reset-token"), resetNewPassword: document.getElementById("reset-new-password"), sendResetBtn: document.getElementById("send-reset-btn"), closeDialogBtn: document.querySelector("[data-close-dialog]"),
  sessionCard: document.getElementById("session-card"), sessionMessage: document.getElementById("session-message"), sessionRole: document.getElementById("session-role"), logoutBtn: document.getElementById("logout-btn"), switchUserBtn: document.getElementById("switch-user-btn"), profileForm: document.getElementById("profile-form"), profileName: document.getElementById("profile-name"), profileSaveBtn: document.getElementById("profile-save-btn"), changePasswordForm: document.getElementById("change-password-form"), currentPassword: document.getElementById("current-password"), newPassword: document.getElementById("new-password"), changePasswordBtn: document.getElementById("change-password-btn"), sessionsList: document.getElementById("sessions-list"), refreshSessionsBtn: document.getElementById("refresh-sessions-btn"), logoutAllBtn: document.getElementById("logout-all-btn"), adminPanel: document.getElementById("admin-panel"), refreshAuditBtn: document.getElementById("refresh-audit-btn"), auditList: document.getElementById("audit-list"), passwordToggles: document.querySelectorAll(".toggle-password")
};
if (!els.authForm || !els.modeSwitch) throw new Error("DOM principal não encontrado");

const apiClient = new ApiClient({ baseUrl: APP_CONFIG.apiBaseUrl, timeoutMs: APP_CONFIG.apiRequestTimeoutMs, getSession: () => state.session, saveSession: storeSession, clearSession });
const authService = new AuthService(apiClient);

void init();
async function init() {
  bindEvents(); hydrateRememberedEmail(); restoreRegisterDraft(); setMode(MODE.LOGIN, false); updatePasswordStrengthUI(""); setCopyPasswordState(); await refreshPublicHealth(); await restoreSession();
}

function bindEvents() {
  els.modeSwitch.addEventListener("click", onModeTabClick); els.modeSwitch.addEventListener("keydown", onModeTabKeyDown); els.authForm.addEventListener("submit", onAuthSubmit); els.authForm.addEventListener("input", onAuthInput);
  els.passwordToggles.forEach((button) => button.addEventListener("click", onTogglePassword));
  els.forgotPasswordTrigger.addEventListener("click", openResetDialog); els.resetForm.addEventListener("submit", onResetSubmit); if (els.closeDialogBtn) els.closeDialogBtn.addEventListener("click", closeResetDialog);
  if (els.resetDialog) {
    els.resetDialog.addEventListener("cancel", (event) => { event.preventDefault(); closeResetDialog(); });
    els.resetDialog.addEventListener("click", (event) => { const rect = els.resetDialog.getBoundingClientRect(); const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom; if (!inside) closeResetDialog(); });
  }
  if (els.demoAccessBtn) els.demoAccessBtn.addEventListener("click", handleDemoAccess);
  if (els.generatePasswordBtn) els.generatePasswordBtn.addEventListener("click", handleGeneratePassword);
  if (els.copyPasswordBtn) els.copyPasswordBtn.addEventListener("click", handleCopyPassword);
  if (els.profileForm) els.profileForm.addEventListener("submit", onProfileSubmit);
  if (els.changePasswordForm) els.changePasswordForm.addEventListener("submit", onChangePasswordSubmit);
  if (els.refreshSessionsBtn) els.refreshSessionsBtn.addEventListener("click", () => loadSessions());
  if (els.logoutAllBtn) els.logoutAllBtn.addEventListener("click", onLogoutAllSessions);
  if (els.refreshAuditBtn) els.refreshAuditBtn.addEventListener("click", () => loadAuditLogs());
  if (els.sessionsList) els.sessionsList.addEventListener("click", onSessionsListClick);
  els.logoutBtn.addEventListener("click", onLogout); els.switchUserBtn.addEventListener("click", onSwitchUser);
  bindCapsLockHint(els.loginPassword, els.capsLogin); bindCapsLockHint(els.registerPassword, els.capsRegister); bindCapsLockHint(els.registerConfirmPassword, els.capsRegister);
}

function onModeTabClick(event) { const tab = event.target.closest(".mode-tab"); if (tab) setMode(tab.dataset.mode, true); }
function onModeTabKeyDown(event) {
  if (!["ArrowRight", "ArrowLeft"].includes(event.key)) return; const tabs = [els.tabLogin, els.tabRegister]; const active = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true"); const next = event.key === "ArrowRight" ? (active + 1) % tabs.length : (active - 1 + tabs.length) % tabs.length; event.preventDefault(); tabs[next].focus(); setMode(tabs[next].dataset.mode, false);
}
function setMode(mode, focusField) {
  if (!Object.values(MODE).includes(mode)) return; state.mode = mode; const isLogin = mode === MODE.LOGIN;
  els.tabLogin.setAttribute("aria-selected", String(isLogin)); els.tabRegister.setAttribute("aria-selected", String(!isLogin)); els.tabLogin.tabIndex = isLogin ? 0 : -1; els.tabRegister.tabIndex = isLogin ? -1 : 0;
  els.modeSwitch.style.setProperty("--indicator-offset", isLogin ? "0%" : "calc(100% + 0.33rem)"); togglePanel(els.panelLogin, isLogin); togglePanel(els.panelRegister, !isLogin); configureRequired(isLogin); clearAllFieldErrors(); clearFeedback(); setLockHint("");
  updatePasswordStrengthUI(isLogin ? "" : els.registerPassword.value); if (focusField && !isAuthenticated()) (isLogin ? els.loginEmail : els.registerName)?.focus();
}
function togglePanel(panel, shouldShow) { panel.hidden = !shouldShow; panel.classList.toggle("is-active", shouldShow); }
function configureRequired(isLogin) { els.loginEmail.required = isLogin; els.loginPassword.required = isLogin; els.registerName.required = !isLogin; els.registerEmail.required = !isLogin; els.registerPassword.required = !isLogin; els.registerConfirmPassword.required = !isLogin; els.registerTerms.required = !isLogin; }
function onAuthInput(event) {
  const target = event.target; if (!target?.id) return; clearFieldError(target.id); clearFeedback();
  if (target.id === "register-password") { updatePasswordStrengthUI(target.value); setCopyPasswordState(); if (els.registerConfirmPassword.value) validateConfirmPassword(); }
  if (target.id === "register-confirm-password") validateConfirmPassword();
  if (isRegisterDraftField(target.id)) persistRegisterDraft();
}

async function onAuthSubmit(event) { event.preventDefault(); if (state.mode === MODE.LOGIN) return submitLogin(); return submitRegister(); }

async function submitLogin() {
  clearAllFieldErrors(); clearFeedback(); setLockHint("");
  const payload = { email: normalizeEmail(els.loginEmail.value), password: els.loginPassword.value, rememberEmail: els.rememberMe.checked };
  const errors = validateLoginPayload(payload); if (Object.keys(errors).length) { applyErrors(errors); showFeedback("Revise os dados antes de continuar.", "error"); return; }
  await withBusyButton(els.loginSubmit, "Entrando...", async () => {
    try {
      const data = await authService.login({ email: payload.email, password: payload.password });
      await finalizeAuthSuccess(data, payload.rememberEmail); showFeedback(`Acesso liberado. Bem-vindo, ${extractFirstName(data.user.name)}.`, "success");
    } catch (error) {
      const message = parseApiError(error, "Falha na autenticação."); if (error.status === 423) setLockHint(message, "warning"); else setFieldError("login-password", "Credenciais inválidas."); showFeedback(message, "error"); throwIfFatal(error);
    }
  });
}

async function submitRegister() {
  clearAllFieldErrors(); clearFeedback();
  const payload = { name: normalizeSpaces(els.registerName.value), email: normalizeEmail(els.registerEmail.value), password: els.registerPassword.value, confirmPassword: els.registerConfirmPassword.value, termsAccepted: els.registerTerms.checked };
  const errors = validateRegisterPayload(payload); if (Object.keys(errors).length) { applyErrors(errors); showFeedback("Existem campos pendentes no cadastro.", "error"); return; }
  await withBusyButton(els.registerSubmit, "Criando conta...", async () => {
    try {
      const data = await authService.register({ name: payload.name, email: payload.email, password: payload.password });
      clearRegisterDraft(); resetRegisterFields(); await finalizeAuthSuccess(data, false); showFeedback(`Conta criada e autenticada com sucesso, ${extractFirstName(data.user.name)}.`, "success");
    } catch (error) {
      if (error.status === 409) setFieldError("register-email", "Este e-mail já está em uso."); showFeedback(parseApiError(error, "Falha ao criar conta."), "error"); throwIfFatal(error);
    }
  });
}

async function handleDemoAccess() {
  clearFeedback(); clearAllFieldErrors(); const demo = APP_CONFIG.demoCredentials; els.loginEmail.value = demo.email; els.loginPassword.value = demo.password; els.rememberMe.checked = true;
  await withBusyButton(els.demoAccessBtn, "Preparando demo...", async () => {
    try {
      const loginData = await authService.login({ email: demo.email, password: demo.password });
      await finalizeAuthSuccess(loginData, true); showFeedback("Conta demo autenticada com sucesso.", "success"); return;
    } catch (error) { if (error.status !== 401) { showFeedback(parseApiError(error, "Falha no acesso demo."), "error"); throwIfFatal(error); return; } }
    try {
      const registerData = await authService.register({ name: demo.name, email: demo.email, password: demo.password });
      await finalizeAuthSuccess(registerData, true); showFeedback("Conta demo criada e autenticada com sucesso.", "success");
    } catch (error) {
      if (error.status === 409) {
        try {
          const loginData = await authService.login({ email: demo.email, password: demo.password });
          await finalizeAuthSuccess(loginData, true); showFeedback("Conta demo autenticada com sucesso.", "success"); return;
        } catch (loginFallbackError) {
          showFeedback("A conta demo já existe, mas a credencial padrão foi alterada.", "error"); throwIfFatal(loginFallbackError); return;
        }
      }
      showFeedback(parseApiError(error, "Não foi possível acessar a conta demo."), "error"); throwIfFatal(error);
    }
  });
}

async function finalizeAuthSuccess(data, rememberEmail) {
  if (rememberEmail) storage.writeString(STORAGE_KEYS.rememberedEmail, data.user.email); else storage.remove(STORAGE_KEYS.rememberedEmail);
  storeSession({ user: data.user, accessToken: data.tokens.accessToken, refreshToken: data.tokens.refreshToken }); state.currentUser = data.user; renderAuthenticatedView(); await hydrateAuthenticatedPanels();
}

async function restoreSession() {
  if (!state.session?.accessToken || !state.session?.refreshToken) return;
  try {
    const meData = await authService.getCurrentUser(); state.currentUser = meData.user; storeSession({ ...state.session, user: meData.user }); renderAuthenticatedView(); await hydrateAuthenticatedPanels(); showFeedback("Sessão restaurada com sucesso.", "info");
  } catch (_error) { clearSession(); renderUnauthenticatedView(); }
}

function renderAuthenticatedView() {
  const user = state.currentUser; if (!user) return;
  els.modeSwitch.hidden = true; els.authForm.hidden = true; els.sessionCard.hidden = false;
  els.sessionMessage.textContent = `Conta ${user.email} autenticada em ${formatDate(user.lastLoginAt)}.`;
  els.sessionRole.textContent = `Perfis: ${(user.roles || ["user"]).join(", ")}`; els.profileName.value = user.name;
}
function renderUnauthenticatedView() { state.currentUser = null; els.sessionCard.hidden = true; els.modeSwitch.hidden = false; els.authForm.hidden = false; setMode(MODE.LOGIN, false); resetSecurityForms(); clearSessionCollections(); }
async function hydrateAuthenticatedPanels() { await Promise.all([loadMetricsForCurrentUser(), loadSessions(), loadAuditLogs()]); }

async function loadMetricsForCurrentUser() {
  if (!state.currentUser) return refreshPublicHealth();
  if (!state.currentUser.roles?.includes("admin")) return refreshPublicHealth();
  try { const metrics = await authService.getMetrics(); updateDashboard(metrics); updateBackendStatusLabel("Online", true); }
  catch (error) { if (error.status === 403) return refreshPublicHealth(); updateBackendStatusLabel("Instável", false); }
}

async function refreshPublicHealth() {
  const startedAt = performance.now();
  try {
    const healthData = await authService.health(); const durationMs = Math.max(Math.round(performance.now() - startedAt), 0);
    updateDashboard(healthData.metrics || {}); updateBackendStatusLabel(`Online (${durationMs}ms)`, true); return healthData;
  } catch (_error) { updateDashboard({}); updateBackendStatusLabel("Offline", false); return null; }
}

function updateDashboard(metrics) {
  const totalUsers = Number(metrics.totalUsers) || 0; const success = Number(metrics.loginSuccessLast24h) || 0; const failures = Number(metrics.loginFailureLast24h) || 0; const attempts = success + failures;
  els.usersCount.textContent = String(totalUsers); els.successRateLabel.textContent = attempts > 0 ? `${Math.round((success / attempts) * 100)}% (${attempts} tentativas)` : "Sem dados";
  if (metrics.latestLogin?.at) { els.lastLoginLabel.textContent = `${extractFirstName(metrics.latestLogin.name)} em ${formatDate(metrics.latestLogin.at)}`; return; }
  els.lastLoginLabel.textContent = "Ainda sem registros";
}
function updateBackendStatusLabel(text, online) { els.backendStatusLabel.textContent = text; els.backendStatusLabel.style.color = online ? "#146c43" : "#b42318"; }
async function loadSessions() {
  if (!isAuthenticated()) return;
  try { const sessionsData = await authService.listSessions(); renderSessionsList(sessionsData.items || []); }
  catch (error) { renderSessionsList([]); showFeedback(parseApiError(error, "Falha ao carregar sessões."), "error"); }
}

function renderSessionsList(items) {
  if (!els.sessionsList) return;
  if (!items.length) { els.sessionsList.innerHTML = "<li class=\"session-empty\">Sem sessões ativas no momento.</li>"; return; }
  els.sessionsList.innerHTML = items.map((session) => {
    const safeIp = sanitizeHtml(session.ip || "IP não informado");
    const safeAgent = sanitizeHtml(session.userAgent || "Agente não informado");
    return `
      <li>
        <div class="session-item-header">
          <span class="session-item-title">Sessão ${session.id.slice(0, 8)}...</span>
          <span class="session-item-time">${formatDate(session.createdAt)}</span>
        </div>
        <p class="session-item-meta">IP: ${safeIp}</p>
        <p class="session-item-meta">Agente: ${safeAgent}</p>
        <button class="secondary-btn session-revoke-btn" type="button" data-revoke-session="${session.id}">Revogar sessão</button>
      </li>`;
  }).join("");
}

async function onSessionsListClick(event) {
  const revokeButton = event.target.closest("[data-revoke-session]"); if (!revokeButton) return;
  const sessionId = revokeButton.dataset.revokeSession; if (!sessionId) return;
  await withBusyButton(revokeButton, "Revogando...", async () => {
    try { await authService.revokeSession(sessionId); showFeedback("Sessão revogada com sucesso.", "success"); await loadSessions(); await loadMetricsForCurrentUser(); }
    catch (error) { showFeedback(parseApiError(error, "Falha ao revogar sessão."), "error"); throwIfFatal(error); }
  });
}

async function onLogoutAllSessions() {
  await withBusyButton(els.logoutAllBtn, "Encerrando...", async () => {
    try {
      await authService.revokeAllSessions(); showFeedback("Todas as sessões foram encerradas.", "info"); clearSession(); renderUnauthenticatedView(); await refreshPublicHealth();
    } catch (error) { showFeedback(parseApiError(error, "Falha ao encerrar sessões."), "error"); throwIfFatal(error); }
  });
}

async function loadAuditLogs() {
  if (!isAuthenticated()) { els.adminPanel.hidden = true; clearAuditList(); return; }
  if (!state.currentUser.roles?.includes("admin")) { els.adminPanel.hidden = true; clearAuditList(); return; }
  els.adminPanel.hidden = false;
  try { const auditData = await authService.listAuditLogs(8); renderAuditList(auditData.items || []); }
  catch (_error) { renderAuditList([]); }
}

function clearAuditList() { if (els.auditList) els.auditList.innerHTML = "<li class=\"session-empty\">Sem eventos disponíveis.</li>"; }
function renderAuditList(items) {
  if (!els.auditList) return;
  if (!items.length) return clearAuditList();
  els.auditList.innerHTML = items.map((eventItem) => `
    <li>
      <div class="audit-item-header">
        <span class="audit-item-title">${sanitizeHtml(formatAuditType(eventItem.type))}</span>
        <span class="audit-item-time">${formatDate(eventItem.createdAt)}</span>
      </div>
      <p class="audit-item-meta">Usuário: ${sanitizeHtml(eventItem.userId || "N/A")}</p>
      <p class="audit-item-meta">IP: ${sanitizeHtml(eventItem.ip || "N/A")}</p>
    </li>`).join("");
}

async function onProfileSubmit(event) {
  event.preventDefault(); if (!isAuthenticated()) return;
  clearFieldError("profile-name"); const name = normalizeSpaces(els.profileName.value);
  if (name.length < 3 || name.length > 80) { setFieldError("profile-name", "Nome deve ter entre 3 e 80 caracteres."); return; }
  await withBusyButton(els.profileSaveBtn, "Salvando...", async () => {
    try {
      const response = await authService.updateProfile({ name }); state.currentUser = response.user; storeSession({ ...state.session, user: response.user }); renderAuthenticatedView(); showFeedback("Perfil atualizado com sucesso.", "success"); await loadMetricsForCurrentUser();
    } catch (error) { showFeedback(parseApiError(error, "Falha ao atualizar perfil."), "error"); throwIfFatal(error); }
  });
}

async function onChangePasswordSubmit(event) {
  event.preventDefault(); if (!isAuthenticated()) return;
  clearFieldError("current-password"); clearFieldError("new-password");
  const currentPassword = els.currentPassword.value; const newPassword = els.newPassword.value;
  if (currentPassword.length < 8) { setFieldError("current-password", "Informe a senha atual corretamente."); return; }
  if (!validateStrongPassword(newPassword)) { setFieldError("new-password", "Nova senha inválida. Use maiúscula, minúscula, número e símbolo."); return; }
  await withBusyButton(els.changePasswordBtn, "Atualizando...", async () => {
    try {
      await authService.changePassword({ currentPassword, newPassword }); showFeedback("Senha alterada. Faça login novamente.", "info"); clearSession(); renderUnauthenticatedView(); await refreshPublicHealth();
    } catch (error) {
      if (error.status === 401) setFieldError("current-password", "Senha atual inválida."); showFeedback(parseApiError(error, "Falha ao alterar senha."), "error"); throwIfFatal(error);
    }
  });
}

async function onLogout() {
  const refreshToken = state.session?.refreshToken;
  if (refreshToken) { try { await authService.logout(refreshToken); } catch (_error) {} }
  clearSession(); renderUnauthenticatedView(); showFeedback("Sessão encerrada com sucesso.", "info"); await refreshPublicHealth();
}
async function onSwitchUser() { await onLogout(); els.loginPassword.value = ""; els.loginEmail.focus(); }

function openResetDialog() {
  clearFieldError("reset-email"); clearFieldError("reset-token"); clearFieldError("reset-new-password");
  if (typeof els.resetDialog.showModal === "function") els.resetDialog.showModal(); else els.resetDialog.setAttribute("open", "open");
  window.setTimeout(() => els.resetEmail.focus(), 0);
}
function closeResetDialog() {
  if (typeof els.resetDialog.close === "function" && els.resetDialog.open) { els.resetDialog.close(); return; }
  els.resetDialog.removeAttribute("open");
}

async function onResetSubmit(event) {
  event.preventDefault(); clearFieldError("reset-email"); clearFieldError("reset-token"); clearFieldError("reset-new-password");
  const email = normalizeEmail(els.resetEmail.value); const token = String(els.resetToken.value || "").trim(); const newPassword = els.resetNewPassword.value;
  if (!isValidEmail(email)) { setFieldError("reset-email", "Informe um e-mail válido."); return; }
  const hasTokenData = token.length > 0 || newPassword.length > 0;
  await withBusyButton(els.sendResetBtn, "Processando...", async () => {
    try {
      if (!hasTokenData) {
        const response = await authService.forgotPassword({ email }); const tokenSuffix = response.resetToken ? ` Token (desenvolvimento): ${response.resetToken}` : ""; showFeedback(`${response.message || "Solicitação registrada com sucesso."}${tokenSuffix}`, "info");
      } else {
        if (!token) { setFieldError("reset-token", "Informe o token de recuperação."); return; }
        if (!validateStrongPassword(newPassword)) { setFieldError("reset-new-password", "Nova senha inválida. Siga a política de senha forte."); return; }
        const response = await authService.resetPassword({ token, newPassword }); showFeedback(response.message || "Senha redefinida com sucesso.", "success");
      }
      closeResetDialog(); els.resetForm.reset();
    } catch (error) { showFeedback(parseApiError(error, "Falha no fluxo de recuperação."), "error"); throwIfFatal(error); }
  });
}
function onTogglePassword(event) {
  const button = event.currentTarget; const targetId = button.dataset.target; const field = document.getElementById(targetId); if (!field) return;
  const nextType = field.type === "password" ? "text" : "password"; field.type = nextType; const isVisible = nextType === "text"; button.textContent = isVisible ? "Ocultar" : "Mostrar"; button.setAttribute("aria-label", isVisible ? "Ocultar senha" : "Mostrar senha");
}
function handleGeneratePassword() { const password = generateSecurePassword(14); els.registerPassword.value = password; els.registerConfirmPassword.value = password; updatePasswordStrengthUI(password); validateConfirmPassword(); setCopyPasswordState(); persistRegisterDraft(); showFeedback("Senha forte gerada automaticamente.", "info"); }
async function handleCopyPassword() { const copied = await copyTextToClipboard(els.registerPassword.value); if (!copied) return showFeedback("Não foi possível copiar automaticamente a senha.", "error"); showFeedback("Senha copiada para a área de transferência.", "success"); }
function setCopyPasswordState() { if (els.copyPasswordBtn) els.copyPasswordBtn.disabled = !els.registerPassword.value; }

function validateLoginPayload(payload) { const errors = {}; if (!isValidEmail(payload.email)) errors["login-email"] = "Informe um e-mail válido."; if (!payload.password || payload.password.length < 8) errors["login-password"] = "Senha deve ter pelo menos 8 caracteres."; return errors; }
function validateRegisterPayload(payload) {
  const errors = {}; if (!payload.name || payload.name.length < 3) errors["register-name"] = "Nome deve ter pelo menos 3 caracteres."; if (!isValidEmail(payload.email)) errors["register-email"] = "Informe um e-mail válido."; if (!validateStrongPassword(payload.password)) errors["register-password"] = APP_CONFIG.passwordPolicyText; if (payload.confirmPassword !== payload.password) errors["register-confirm-password"] = "As senhas não coincidem."; if (!payload.termsAccepted) errors["register-terms"] = "Aceite os termos para continuar."; return errors;
}
function validateConfirmPassword() { const value = els.registerConfirmPassword.value; if (!value) return clearFieldError("register-confirm-password"), true; if (value !== els.registerPassword.value) return setFieldError("register-confirm-password", "As senhas não coincidem."), false; clearFieldError("register-confirm-password"); return true; }
function updatePasswordStrengthUI(password) {
  const strength = evaluatePasswordStrength(password); const levels = ["is-weak", "is-medium", "is-good", "is-strong"]; els.strengthBar.classList.remove(...levels); if (strength.levelClass) els.strengthBar.classList.add(strength.levelClass); els.strengthBar.style.width = `${strength.width}%`; els.strengthLabel.textContent = `Força da senha: ${strength.label}.`; els.requirementItems.forEach((item) => item.classList.toggle("is-valid", Boolean(strength.rules[item.dataset.rule])));
}
function bindCapsLockHint(input, hintNode) {
  if (!input || !hintNode) return;
  const updateHint = (event) => setCapsHint(hintNode, event.getModifierState("CapsLock") ? "Caps Lock ativado." : "");
  input.addEventListener("keydown", updateHint); input.addEventListener("keyup", updateHint); input.addEventListener("blur", () => setCapsHint(hintNode, ""));
}
function setCapsHint(node, message) { if (!node) return; node.textContent = message; node.className = message ? "inline-hint is-warning" : "inline-hint"; }
function setLockHint(message, tone = "info") { if (!els.lockHint) return; els.lockHint.textContent = message || ""; els.lockHint.className = message ? `inline-hint is-${tone}` : "inline-hint"; }

function persistRegisterDraft() { storage.writeJson(STORAGE_KEYS.registerDraft, { name: normalizeSpaces(els.registerName.value), email: normalizeEmail(els.registerEmail.value), termsAccepted: Boolean(els.registerTerms.checked), updatedAt: new Date().toISOString() }); }
function restoreRegisterDraft() { const draft = storage.readJson(STORAGE_KEYS.registerDraft, null); if (!draft || typeof draft !== "object") return; if (typeof draft.name === "string") els.registerName.value = draft.name; if (typeof draft.email === "string") els.registerEmail.value = draft.email; els.registerTerms.checked = Boolean(draft.termsAccepted); }
function clearRegisterDraft() { storage.remove(STORAGE_KEYS.registerDraft); }
function isRegisterDraftField(fieldId) { return ["register-name", "register-email", "register-terms"].includes(fieldId); }
function hydrateRememberedEmail() { const remembered = storage.readString(STORAGE_KEYS.rememberedEmail, ""); if (!remembered) return; els.loginEmail.value = remembered; els.rememberMe.checked = true; }

function storeSession(session) { state.session = { user: session.user, accessToken: session.accessToken, refreshToken: session.refreshToken }; storage.writeJson(STORAGE_KEYS.authSession, state.session); }
function clearSession() { state.session = null; state.currentUser = null; storage.remove(STORAGE_KEYS.authSession); }
function isAuthenticated() { return Boolean(state.session?.accessToken && state.currentUser?.id); }

function resetRegisterFields() { els.registerName.value = ""; els.registerEmail.value = ""; els.registerPassword.value = ""; els.registerConfirmPassword.value = ""; els.registerTerms.checked = false; updatePasswordStrengthUI(""); setCopyPasswordState(); setCapsHint(els.capsRegister, ""); }
function resetSecurityForms() { if (els.profileName) els.profileName.value = ""; if (els.currentPassword) els.currentPassword.value = ""; if (els.newPassword) els.newPassword.value = ""; }
function clearSessionCollections() { if (els.sessionsList) els.sessionsList.innerHTML = ""; clearAuditList(); }

function setFieldError(fieldId, message) { const field = document.getElementById(fieldId); const errorNode = document.getElementById(`error-${fieldId}`); if (field) field.setAttribute("aria-invalid", message ? "true" : "false"); if (errorNode) errorNode.textContent = message || ""; }
function clearFieldError(fieldId) { setFieldError(fieldId, ""); }
function clearAllFieldErrors() { document.querySelectorAll(".field-error").forEach((node) => { node.textContent = ""; }); document.querySelectorAll("input").forEach((input) => input.setAttribute("aria-invalid", "false")); }
function applyErrors(errors) { Object.entries(errors).forEach(([fieldId, message]) => setFieldError(fieldId, message)); }
function showFeedback(message, tone) { els.feedback.textContent = message; els.feedback.className = `feedback is-visible is-${tone}`; }
function clearFeedback() { els.feedback.textContent = ""; els.feedback.className = "feedback"; }

async function withBusyButton(button, label, callback) {
  if (!button) return callback();
  const original = button.textContent; button.disabled = true; button.dataset.busy = "true"; button.textContent = label;
  try { await callback(); } finally { button.disabled = false; button.textContent = original; button.removeAttribute("data-busy"); }
}

function sanitizeHtml(value) { return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;"); }
function formatAuditType(type) { return String(type || "evento").replace(/\./g, " > "); }
function throwIfFatal(error) { if (error.status === 0 || error.status >= 500) console.error(error); }
