/* ══ auth.js — sessão real com backend Spring + tema ════════════════ */

const API_BASE_URL = "http://localhost:8080/api/v1";

const KEYS = {
  session: "rf_session",
  remember: "rf_remember",
  theme: "rf_theme",
  accessToken: "rf_access_token",
  refreshToken: "rf_refresh_token"
};

/* ── Storage helpers ─────────────────────────────────────────────── */
const store = {
  get: k => {
    try {
      return JSON.parse(localStorage.getItem(k));
    } catch {
      return null;
    }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: k => localStorage.removeItem(k)
};

/* ── Tokens ──────────────────────────────────────────────────────── */
function limparBearer(token) {
  if (!token) return "";

  return String(token)
    .replace(/^"+|"+$/g, "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

function getAccessToken() {
  return limparBearer(localStorage.getItem(KEYS.accessToken));
}

function getRefreshToken() {
  return limparBearer(localStorage.getItem(KEYS.refreshToken));
}

function setTokens(accessToken, refreshToken = "") {
  const cleanAccess = limparBearer(accessToken);
  const cleanRefresh = limparBearer(refreshToken);

  if (!cleanAccess) {
    console.error("Tentou salvar accessToken vazio:", accessToken);
    return;
  }

  localStorage.setItem(KEYS.accessToken, cleanAccess);

  if (cleanRefresh) {
    localStorage.setItem(KEYS.refreshToken, cleanRefresh);
  } else {
    localStorage.removeItem(KEYS.refreshToken);
  }

  console.log("TOKEN SALVO:", {
    accessTokenExiste: !!localStorage.getItem(KEYS.accessToken),
    refreshTokenExiste: !!localStorage.getItem(KEYS.refreshToken),
    accessInicio: cleanAccess.substring(0, 25) + "..."
  });
}

function clearTokens() {
  localStorage.removeItem(KEYS.accessToken);
  localStorage.removeItem(KEYS.refreshToken);
}

async function loginUser(email, senha) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        senha
      })
    });

    const text = await response.text();

    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    console.log("RESPOSTA LOGIN STATUS:", response.status);
    console.log("RESPOSTA LOGIN BODY:", data || text);

    if (!response.ok) {
      return {
        ok: false,
        error: data?.erro || data?.message || text || "E-mail ou senha incorretos."
      };
    }

    const accessToken =
      data?.accessToken ||
      data?.token ||
      data?.access_token ||
      data?.jwt ||
      data?.jwtToken ||
      data?.data?.accessToken ||
      data?.data?.token;

    const refreshToken =
      data?.refreshToken ||
      data?.refresh_token ||
      data?.data?.refreshToken ||
      "";

    if (!accessToken) {
      console.error("Backend não retornou token válido:", data || text);

      return {
        ok: false,
        error: "Backend não retornou token."
      };
    }

    setTokens(accessToken, refreshToken);

    const tokenSalvo = getAccessToken();
    const payload = decodeJwtPayload(tokenSalvo);

    console.log("PAYLOAD DO TOKEN:", payload);

    const role = normalizarRole(
      data?.role ||
      data?.usuario?.role ||
      data?.user?.role ||
      payload?.role ||
      payload?.authority ||
      payload?.authorities ||
      payload?.roles ||
      payload?.perfil ||
      "USER"
    );

    const user = {
      name:
        data?.username ||
        data?.nome ||
        data?.usuario?.username ||
        data?.usuario?.nome ||
        data?.user?.name ||
        data?.user?.username ||
        payload?.sub ||
        email,
      email:
        data?.email ||
        data?.usuario?.email ||
        data?.user?.email ||
        payload?.sub ||
        email,
      provider: "backend",
      role
    };

    setSession(user);

    console.log("LOGIN OK, SESSÃO SALVA:", {
      tokenExiste: !!getAccessToken(),
      tokenInicio: getAccessToken().substring(0, 25) + "...",
      session: getSession(),
      role
    });

    return {
      ok: true,
      user
    };

  } catch (error) {
    console.error("Erro no login:", error);

    return {
      ok: false,
      error: "Erro ao conectar com o servidor."
    };
  }
}
/* ── JWT / Roles ─────────────────────────────────────────────────── */
function decodeJwtPayload(token) {
  try {
    token = limparBearer(token);

    if (!token || !token.includes(".")) return {};

    const base64Payload = token.split(".")[1];

    const payload = base64Payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const json = decodeURIComponent(
      atob(payload)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(json);
  } catch (error) {
    console.error("Erro ao decodificar token:", error);
    return {};
  }
}

function normalizarRole(role) {
  if (!role) return "USER";

  if (Array.isArray(role)) {
    role = role[0];
  }

  if (typeof role === "object") {
    role = role.authority || role.role || role.name || "USER";
  }

  return String(role)
    .replace("ROLE_", "")
    .toUpperCase();
}

function extrairRoleDoPayload(payload) {
  return normalizarRole(
    payload?.role ||
    payload?.authority ||
    payload?.authorities ||
    payload?.roles ||
    payload?.perfil ||
    payload?.scope ||
    "USER"
  );
}

function getCurrentRole() {
  const session = getSession();

  if (session?.role) {
    return normalizarRole(session.role);
  }

  const token = getAccessToken();

  if (!token) {
    return "USER";
  }

  const payload = decodeJwtPayload(token);

  return extrairRoleDoPayload(payload);
}

function canAccessSection(section) {
  const role = getCurrentRole();

  const permissions = {
    ADMIN: [
      "dashboard",
      "salas",
      "reservas",
      "calendario",
      "usuarios",
      "grupos",
      "ia",
      "relatorios",
      "configuracoes"
    ],

    TECHLEADER: [
      "salas",
      "reservas",
      "calendario",
      "grupos",
      "ia",
      "configuracoes"
    ],

    USER: [
      "salas",
      "reservas",
      "calendario",
      "grupos",
      "configuracoes"
    ]
  };

  return permissions[role]?.includes(section) || false;
}

function getDefaultSectionForRole() {
  const role = getCurrentRole();

  if (role === "ADMIN") {
    return "dashboard";
  }

  return "salas";
}

function getRoleLabel() {
  const role = getCurrentRole();

  return {
    ADMIN: "Administrador",
    TECHLEADER: "Tech Leader",
    USER: "Usuário"
  }[role] || "Usuário";
}

/* ── Session ─────────────────────────────────────────────────────── */
function getSession() {
  return store.get(KEYS.session);
}

function setSession(user) {
  store.set(KEYS.session, {
    name: user.name || user.username || user.email || "Usuário",
    email: user.email || "",
    provider: user.provider || "backend",
    role: normalizarRole(user.role || "USER"),
    at: Date.now()
  });
}

function clearSession() {
  store.del(KEYS.session);
  clearTokens();
}

function requireAuth() {
  const session = getSession();
  const token = getAccessToken();

  if (!session || !token) {
    clearSession();
    window.location.href = "../index.html";
    return null;
  }

  return session;
}

/* ── Remember me ─────────────────────────────────────────────────── */
function getRemembered() {
  return store.get(KEYS.remember);
}

function saveRemembered(email, senha) {
  store.set(KEYS.remember, { email, senha });
}

function clearRemembered() {
  store.del(KEYS.remember);
}

/* ── API central com token ───────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const token = getAccessToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.log("apiFetch:", path, "Token enviado?", !!token);

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401 && getRefreshToken()) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      const novoToken = getAccessToken();

      if (novoToken) {
        headers.Authorization = `Bearer ${novoToken}`;
      }

      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers
      });
    }
  }

  if (response.status === 401) {
    console.warn("apiFetch recebeu 401 em:", path);
    clearSession();
    window.location.href = "../index.html";
    return response;
  }

  return response;
}

async function refreshAccessToken() {
  try {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearSession();
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        refreshToken
      })
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    const accessToken =
      data?.accessToken ||
      data?.token ||
      data?.access_token ||
      data?.jwt ||
      data?.jwtToken ||
      data?.data?.accessToken ||
      data?.data?.token;

    const newRefreshToken =
      data?.refreshToken ||
      data?.refresh_token ||
      data?.data?.refreshToken ||
      refreshToken;

    if (!response.ok || !accessToken) {
      clearSession();
      return false;
    }

    setTokens(accessToken, newRefreshToken);

    return true;

  } catch (error) {
    console.error("Erro ao renovar token:", error);
    clearSession();
    return false;
  }
}

/* ── Cadastro real no backend ────────────────────────────────────── */
async function registerUser({ name, email, password, tipoFuncionario = "OUTRO" }) {
  try {
    const payload = {
      email,
      senha: password,
      username: name,
      role: "USER",
      tipoFuncionario
    };

    console.log("Payload cadastro:", payload);

    const response = await fetch(`${API_BASE_URL}/auth/cadastro`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();

    if (!response.ok) {
      console.error("Erro cadastro:", response.status, text);

      return {
        ok: false,
        error: text || "Erro ao cadastrar usuário."
      };
    }

    return {
      ok: true,
      user: {
        name,
        email,
        provider: "backend",
        role: "USER",
        tipoFuncionario
      }
    };

  } catch (error) {
    console.error("Erro no cadastro:", error);

    return {
      ok: false,
      error: "Erro ao conectar com o servidor."
    };
  }
}

/* ── Logout real ─────────────────────────────────────────────────── */
async function logoutUser() {
  const refreshToken = getRefreshToken();

  try {
    if (refreshToken) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          refreshToken
        })
      });
    }
  } catch (error) {
    console.error("Erro no logout:", error);
  }

  clearSession();
}

/* ── OAuth desativado por enquanto ───────────────────────────────── */
function loginWithOAuth(provider) {
  return {
    ok: false,
    error: `Login com ${provider} ainda não está conectado ao backend.`
  };
}

/* ── Theme ───────────────────────────────────────────────────────── */
const sysPref = window.matchMedia("(prefers-color-scheme: dark)");

function resolveTheme(pref) {
  if (pref === "system") return sysPref.matches ? "dark" : "light";
  return pref;
}

function applyTheme(pref) {
  const effective = resolveTheme(pref);

  document.body.dataset.theme = pref;
  document.body.dataset.effectiveTheme = effective;

  localStorage.setItem(KEYS.theme, pref);

  document.querySelectorAll("[data-theme-btn]").forEach(btn => {
    const active = btn.dataset.themeBtn === pref;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });

  const icon = document.getElementById("theme-icon");

  if (icon) {
    icon.innerHTML = effective === "dark"
      ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
      : '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
  }
}

function initTheme() {
  const saved = localStorage.getItem(KEYS.theme) || "system";
  applyTheme(saved);

  sysPref.addEventListener("change", () => {
    if (document.body.dataset.theme === "system") {
      document.body.dataset.effectiveTheme = sysPref.matches ? "dark" : "light";
    }
  });

  document.querySelectorAll("[data-theme-btn]").forEach(btn => {
    btn.addEventListener("click", () => applyTheme(btn.dataset.themeBtn));
  });
}