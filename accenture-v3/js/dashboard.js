/* ══ dashboard.js — versão limpa e funcionando ═════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initTheme === "function") {
    initTheme();
  }

  if (typeof requireAuth !== "function") {
    console.error("auth.js não carregou antes do dashboard.js");
    return;
  }

  if (typeof RF === "undefined") {
    console.error("storage.js não carregou antes do dashboard.js");
    return;
  }

  const session = requireAuth();
  if (!session) return;

  /* ── Helpers ─────────────────────────────────────────────────── */

  function safeToast(title, message, type = "info") {
    if (typeof showToast === "function") {
      showToast(title, message, type);
    } else {
      console.log(`[${type}] ${title}: ${message}`);
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

  function getSafeRole() {
    if (typeof getCurrentRole === "function") {
      return normalizarRole(getCurrentRole());
    }

    try {
      const s = JSON.parse(localStorage.getItem("rf_session") || "{}");
      return normalizarRole(s.role || "USER");
    } catch {
      return "USER";
    }
  }

  function getSafeRoleLabel() {
    if (typeof getRoleLabel === "function") {
      return getRoleLabel();
    }

    const role = getSafeRole();

    return {
      ADMIN: "Administrador",
      TECHLEADER: "Tech Leader",
      USER: "Usuário"
    }[role] || "Usuário";
  }

  function canAccess(name) {
    if (typeof canAccessSection === "function") {
      return canAccessSection(name);
    }

    return true;
  }

  function getInitialSection() {
    if (typeof getDefaultSectionForRole === "function") {
      return getDefaultSectionForRole();
    }

    return getSafeRole() === "ADMIN" ? "dashboard" : "salas";
  }

  function getToken() {
    if (typeof getAccessToken === "function") {
      return getAccessToken();
    }

    return localStorage.getItem("rf_access_token");
  }

 async function fetchArraySeguro(path) {
  try {
    const token = getToken();

    const headers = {
      "Content-Type": "application/json"
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    console.log("====================================");
    console.log("GET:", `${API_BASE_URL}${path}`);
    console.log("TOKEN EXISTE?", !!token);
    console.log("TOKEN COMEÇO:", token ? token.substring(0, 25) + "..." : "SEM TOKEN");
    console.log("AUTH HEADER:", headers.Authorization || "SEM AUTHORIZATION");

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers
    });

    const texto = await response.text();

    console.log("STATUS:", response.status);
    console.log("RESPOSTA:", texto);

    if (!response.ok) {
      return [];
    }

    if (!texto) {
      return [];
    }

    const data = JSON.parse(texto);

    if (Array.isArray(data)) return data;
    if (Array.isArray(data.content)) return data.content;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.items)) return data.items;

    return [];

  } catch (error) {
    console.warn("Erro no GET:", path, error);
    return [];
  }
}
 /* ── Perfil/header ───────────────────────────────────────────── */

  const perfil = RF.getPerfil ? RF.getPerfil() : {};
  const name = perfil.name || session.name || "Usuário";
  const email = perfil.email || session.email || "";
  const firstName = name.split(" ")[0];

  function updateHeaderUser() {
    const p = RF.getPerfil ? RF.getPerfil() : {};
    const n = p.name || name;
    const av = p.avatar;

    document.querySelectorAll("#user-display-name").forEach(el => {
      el.textContent = n.split(" ")[0];
    });

    document.querySelectorAll(".user-chip .user-avatar, #user-avatar").forEach(el => {
      if (av) {
        el.innerHTML = `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      } else {
        el.textContent = n[0]?.toUpperCase() || "U";
      }
    });

    const adName = document.getElementById("account-dropdown-name");
    const adEmail = document.getElementById("account-dropdown-email");
    const roleLabel = document.getElementById("user-role-label");

    if (adName) adName.textContent = n;
    if (adEmail) adEmail.textContent = p.email || email;
    if (roleLabel) roleLabel.textContent = getSafeRoleLabel();
  }

  updateHeaderUser();

  const h1 = document.querySelector(".welcome-row h1");

  if (h1) {
    h1.textContent = `Olá, ${firstName} 👋`;
  }

  const dateEl = document.getElementById("current-date");

  if (dateEl) {
    const now = new Date();

    const s = now.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });

    dateEl.textContent = s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ── Seções ──────────────────────────────────────────────────── */

  const sections = document.querySelectorAll(".dash-section");
  const initialized = new Set();

  function showSection(name) {
    if (!canAccess(name)) {
      safeToast(
        "Acesso restrito",
        "Você não tem permissão para acessar essa área.",
        "error"
      );

      name = getInitialSection();
    }

    const exists = Array.from(sections).some(section => {
      return section.dataset.section === name;
    });

    if (!exists) {
      console.warn("Seção não encontrada:", name);
      name = "salas";
    }

    sections.forEach(section => {
      section.classList.toggle("active", section.dataset.section === name);
    });

    document.querySelectorAll(".nav-item[data-section]").forEach(item => {
      item.classList.toggle("active", item.dataset.section === name);
    });

    if (!initialized.has(name)) {
      initialized.add(name);

      if (name === "dashboard") window.wireDashboardCharts?.();
      if (name === "salas") window.initSalas?.();
      if (name === "assentos") window.initAssentos?.();
      if (name === "reservas") window.initReservas?.();
      if (name === "calendario") window.initCalendario?.();
      if (name === "usuarios") window.initUsuarios?.();
      if (name === "grupos") window.initGrupos?.();
      if (name === "ia") window.initIA?.();
      if (name === "relatorios") window.initRelatorios?.();

      if (name === "configuracoes") {
        window.initConfiguracoes?.();
        window.reloadPerfil?.();
      }
    }

    setTimeout(() => {
      document
        .querySelector(`.dash-section[data-section="${name}"]`)
        ?.querySelectorAll(".bar-fill[data-width]")
        .forEach(bar => {
          bar.style.width = "0";

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              bar.style.width = bar.dataset.width + "%";
            });
          });
        });
    }, 100);

    if (name === "dashboard" && getSafeRole() === "ADMIN") {
      setTimeout(carregarDashboardAdmin, 300);
    }
  }

  window.showSection = showSection;

  if (!window.__goSectionHandlerInstalled) {
  window.__goSectionHandlerInstalled = true;

  document.addEventListener("click", event => {
    const btn = event.target.closest("[data-go-section]");

    if (!btn) return;

    event.preventDefault();

    const section = btn.dataset.goSection;

    if (typeof window.showSection === "function") {
      window.showSection(section);
      return;
    }

    document.querySelector(`.nav-item[data-section="${section}"]`)?.click();
  });
}

  if (typeof initSidebar === "function") {
    initSidebar(showSection);
  } else {
    console.error("sidebar.js não carregou antes do dashboard.js");
  }

  const sectionInicial = getInitialSection();

  console.log("ROLE ATUAL:", getSafeRole());
  console.log("SEÇÃO INICIAL:", sectionInicial);

  showSection(sectionInicial);

  /* ── Tema ────────────────────────────────────────────────────── */

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const next = document.body.dataset.effectiveTheme === "dark" ? "light" : "dark";

    if (typeof applyTheme === "function") {
      applyTheme(next);
    }

    window.dispatchEvent(new Event("themechange"));
  });

  /* ── Dropdown perfil/notificações ────────────────────────────── */

  function closeAll(except) {
    document.querySelectorAll(".dropdown-panel").forEach(panel => {
      if (panel !== except) {
        panel.classList.remove("open");
      }
    });

    document.querySelectorAll(".user-chip").forEach(chip => {
      chip.classList.remove("open");
    });
  }

  function toggle(panel, chip) {
    if (!panel) return;

    closeAll(panel);

    const open = panel.classList.toggle("open");
    chip?.classList.toggle("open", open);
  }

  document.getElementById("notif-btn")?.addEventListener("click", event => {
    event.stopPropagation();
    toggle(document.getElementById("notif-panel"));
  });

  document.getElementById("user-chip")?.addEventListener("click", event => {
    event.stopPropagation();

    toggle(
      document.getElementById("account-panel"),
      document.getElementById("user-chip")
    );
  });

  document.addEventListener("click", () => closeAll(null));

  document.querySelectorAll(".dropdown-panel").forEach(panel => {
    panel.addEventListener("click", event => event.stopPropagation());
  });

  document.getElementById("go-config")?.addEventListener("click", event => {
    event.preventDefault();
    closeAll(null);
    showSection("configuracoes");
  });

  document.getElementById("go-profile")?.addEventListener("click", event => {
    event.preventDefault();
    closeAll(null);
    showSection("configuracoes");
  });

  /* ── Logout ──────────────────────────────────────────────────── */

  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener("click", async event => {
      event.preventDefault();
      event.stopPropagation();

      try {
        if (typeof logoutUser === "function") {
          await logoutUser();
        }
      } catch (error) {
        console.warn("Erro no logout:", error);
      }

      try {
        if (typeof clearSession === "function") {
          clearSession();
        }
      } catch {}

      localStorage.removeItem("rf_session");
      localStorage.removeItem("rf_access_token");
      localStorage.removeItem("rf_refresh_token");

      window.location.href = "../index.html";
    });
  });

  /* ── Notificações ────────────────────────────────────────────── */

  const NOTIFS = [
    {
      color: "green",
      title: "Reserva confirmada",
      desc: "Sala reservada com sucesso.",
      time: "5 min atrás"
    },
    {
      color: "blue",
      title: "IA disponível",
      desc: "Use a IA para reservas em grupo.",
      time: "1h atrás"
    },
    {
      color: "orange",
      title: "Atenção",
      desc: "Confira os horários antes de reservar.",
      time: "2h atrás"
    }
  ];

  const notifList = document.getElementById("notif-list");

  if (notifList) {
    notifList.innerHTML = NOTIFS.map((notif, index) => `
      <div class="notif-item" data-notif="${index}">
        <span class="notif-dot-color ${notif.color}"></span>

        <div class="notif-item-body">
          <strong>${notif.title}</strong>
          <p>${notif.desc}</p>
          <time>${notif.time}</time>
        </div>
      </div>
    `).join("");

    notifList.querySelectorAll(".notif-item").forEach(item => {
      item.addEventListener("click", () => {
        item.style.opacity = "0.4";
        item.style.pointerEvents = "none";

        updateNotifBadge();
      });
    });
  }

  function updateNotifBadge() {
    const v = notifList?.querySelectorAll('.notif-item:not([style*="opacity"])').length || 0;

    const count = document.getElementById("notif-count");
    const btn = document.getElementById("notif-btn");

    if (count) {
      count.textContent = `${v} nova${v !== 1 ? "s" : ""}`;
    }

    btn?.classList.toggle("has-dot", v > 0);
  }

  updateNotifBadge();

  /* ── Busca global ────────────────────────────────────────────── */

  const searchInput = document.querySelector(".dash-search input");
  const searchWrap = document.querySelector(".dash-search");

  let resultsBox = document.getElementById("search-results");

  if (!resultsBox && searchWrap) {
    resultsBox = document.createElement("div");
    resultsBox.id = "search-results";
    resultsBox.className = "search-results";
    searchWrap.style.position = "relative";
    searchWrap.appendChild(resultsBox);
  }

  const SEARCH_DATA = [
    { label: "Dashboard", section: "dashboard", icon: "grid" },
    { label: "Salas", section: "salas", icon: "building" },
    { label: "Assentos", section: "assentos", icon: "seat" },
    { label: "Reservas", section: "reservas", icon: "calendar" },
    { label: "Calendário", section: "calendario", icon: "calendar" },
    { label: "Usuários", section: "usuarios", icon: "users" },
    { label: "Grupos", section: "grupos", icon: "users" },
    { label: "Relatórios", section: "relatorios", icon: "bar" },
    { label: "Configurações", section: "configuracoes", icon: "settings" },
    { label: "Centro de IA", section: "ia", icon: "cpu" }
  ].filter(item => canAccess(item.section));

  const ICONS = {
    building: '<path d="M3 21h18M5 21V7l7-4 7 4v14"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
    bar: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    seat: '<rect x="3" y="7" width="18" height="10" rx="2"/>'
  };

  searchInput?.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();

    if (!q || !resultsBox) {
      resultsBox?.classList.remove("open");
      return;
    }

    const hits = SEARCH_DATA
      .filter(item => item.label.toLowerCase().includes(q))
      .slice(0, 6);

    if (!hits.length) {
      resultsBox.classList.remove("open");
      return;
    }

    resultsBox.innerHTML = hits.map(hit => `
      <div class="search-result-item" data-section="${hit.section}">
        <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2">
          ${ICONS[hit.icon] || ""}
        </svg>

        <span>${hit.label}</span>

        <span style="margin-left:auto;font-size:0.7rem;color:var(--text-muted)">
          Ir para
        </span>
      </div>
    `).join("");

    resultsBox.querySelectorAll(".search-result-item").forEach(item => {
      item.addEventListener("click", () => {
        showSection(item.dataset.section);

        searchInput.value = "";
        resultsBox.classList.remove("open");
      });
    });

    resultsBox.classList.add("open");
  });

  searchInput?.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      resultsBox?.classList.remove("open");
      searchInput.value = "";
    }
  });

  document.addEventListener("click", event => {
    if (!searchWrap?.contains(event.target)) {
      resultsBox?.classList.remove("open");
    }
  });

  /* ── Salas disponíveis locais até backend sobrescrever ────────── */

  function renderAvailRooms() {
    const list = document.getElementById("avail-rooms-list");

    if (!list || !RF.getSalas) return;

    const avail = RF.getSalas()
      .filter(sala => sala.status === "green")
      .slice(0, 4);

    list.innerHTML = avail.map(sala => {
      const src = RF.getSalaImg ? RF.getSalaImg(sala.id) || sala.img || "" : sala.img || "";

      return `
        <div class="avail-room-item">
          ${
            src
              ? `<img class="avail-room-photo" src="${src}" alt="${sala.name}" onerror="this.style.display='none'">`
              : '<div class="avail-room-photo" style="background:var(--surface-2)"></div>'
          }

          <div class="avail-room-info">
            <strong>${sala.name}</strong>
            <small>${sala.floor} &nbsp;•&nbsp; ${sala.cap} pessoas</small>
          </div>

          <span class="avail-dot"></span>
        </div>
      `;
    }).join("");
  }

  renderAvailRooms();

  /* ── Modal close ─────────────────────────────────────────────── */

  document.querySelectorAll("[data-modal-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.modalClose;

      if (typeof closeModal === "function") {
        closeModal(modalId);
      } else {
        document.getElementById(modalId)?.classList.remove("open");
      }
    });
  });

  /* ── Dashboard ADMIN real ────────────────────────────────────── */

  async function carregarDashboardAdmin() {
  console.log("Carregando dashboard com endpoints reais...");

  try {
    const salas = await fetchArraySeguro("/salas");
    const reservas = await fetchArraySeguro("/reservas/historico");
    const usuarios = await fetchArraySeguro("/usuarios/listarUsuarios");
    const grupos = await fetchArraySeguro("/grupos");

    const hoje = new Date().toISOString().slice(0, 10);

    const reservasHoje = reservas.filter(r => {
      const data =
        r.dataReserva ||
        r.data ||
        r.date;

      return data === hoje;
    });

    const reservasAtivas = reservas.filter(r => {
      const status =
        r.statusReserva ||
        r.status ||
        "CONFIRMADA";

      return status !== "CANCELADA";
    });

    const totalSalas = salas.length;

    const totalUsuarios = usuarios.filter(u => {
      return !u.deletado && u.status !== "Inativo";
    }).length;

    const ocupacaoHoje =
      totalSalas > 0
        ? Math.min(100, Math.round((reservasHoje.length / totalSalas) * 100))
        : 0;

   atualizarCardsDashboard({
  reservasHoje: reservasHoje.length,
  totalSalas,
  totalUsuarios,
  reservasAtivas: reservasAtivas.length,
  totalGrupos: grupos.length
});

atualizarReunioesHoje(reservasHoje);
atualizarSalasDashboard(salas);
atualizarGraficoStatusReservas(reservas);
atualizarSalasMaisUsadas(reservas); console.log("DASHBOARD OK:", {
      salas,
      reservas,
      usuarios,
      grupos
    });

  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);
  }
}
  window.carregarDashboardAdmin = carregarDashboardAdmin;

  function atualizarCardsDashboard(dados) {
  const cards = document.querySelectorAll('.dash-section[data-section="dashboard"] .stat-card');

  atualizarCard(cards[0], "Reservas hoje", dados.reservasHoje, "Hoje");
  atualizarCard(cards[1], "Salas cadastradas", dados.totalSalas, "Total");
  atualizarCard(cards[2], "Reservas ativas", dados.reservasAtivas, "Confirmadas");
  atualizarCard(cards[3], "Usuários ativos", dados.totalUsuarios, "Sistema");
}
  function atualizarCard(card, titulo, valor, legenda) {
    if (!card) return;

    const tituloEl = card.querySelector(".stat-card-top span");
    const valorEl = card.querySelector(".stat-value");
    const trendEl = card.querySelector(".stat-trend");

    if (tituloEl) tituloEl.textContent = titulo;
    if (valorEl) valorEl.textContent = valor;

    if (trendEl) {
      trendEl.textContent = legenda;
      trendEl.classList.remove("up", "down");
      trendEl.classList.add("up");
    }
  }

  function atualizarReunioesHoje(reservasHoje) {
    const card = document.querySelector(".meetings-card");

    if (!card) return;

    card.querySelectorAll(".meeting-item, .grupo-empty").forEach(el => el.remove());

    if (!reservasHoje.length) {
      card.insertAdjacentHTML("beforeend", `
        <div class="grupo-empty">
          Nenhuma reserva para hoje.
        </div>
      `);
      return;
    }

    reservasHoje.slice(0, 5).forEach(reserva => {
      card.insertAdjacentHTML("beforeend", `
        <div class="meeting-item">
          <div class="meeting-time">
            <span class="time-start">${String(reserva.horarioInicio || "").slice(0, 5)}</span>
            <span class="time-end">${String(reserva.horarioFim || "").slice(0, 5)}</span>
          </div>

          <div class="meeting-body">
            <strong>${reserva.nomeSala || reserva.salaNome || "Sala"}</strong>
            <span>
              Assento ${reserva.posicaoAssento || "—"}
              &nbsp;•&nbsp;
              ${reserva.codigoGrupo ? "Grupo" : "Individual"}
            </span>
          </div>

          <span class="meeting-status confirmed">
            ${reserva.statusReserva || "CONFIRMADA"}
          </span>
        </div>
      `);
    });
  }

  function atualizarSalasDashboard(salas) {
    const list = document.getElementById("avail-rooms-list");

    if (!list) return;

    if (!salas.length) {
      list.innerHTML = `
        <div class="grupo-empty">
          Nenhuma sala cadastrada.
        </div>
      `;
      return;
    }

    list.innerHTML = salas.slice(0, 5).map(sala => {
      const nome = sala.nome || sala.name || "Sala";
      const capacidade = sala.capacidade || sala.cap || 0;

      const local = [
        sala.local,
        sala.bloco ? `Bloco ${sala.bloco}` : null,
        sala.andar ? `Andar ${sala.andar}` : null,
        sala.cidade && sala.estado ? `${sala.cidade}/${sala.estado}` : sala.cidade,
        sala.floor,
        sala.localizacao
      ].filter(Boolean).join(" · ") || "Local não informado";

      return `
        <div class="avail-room-item">
          <div class="avail-room-photo" style="background:var(--surface-2);display:flex;align-items:center;justify-content:center">
            <svg viewBox="0 0 24 24" style="width:22px;height:22px;stroke:var(--text-muted);fill:none;stroke-width:2">
              <path d="M3 21h18M5 21V7l7-4 7 4v14"/>
            </svg>
          </div>

          <div class="avail-room-info">
            <strong>${nome}</strong>
            <small>${local} &nbsp;•&nbsp; ${capacidade} pessoas</small>
          </div>

          <span class="avail-dot"></span>
        </div>
      `;
    }).join("");
  }

  function normalizarStatusReserva(reserva) {
  return String(
    reserva.statusReserva ||
    reserva.status ||
    "CONFIRMADA"
  ).toUpperCase();
}

function atualizarGraficoStatusReservas(reservas) {
  const donut = document.getElementById("dashboard-status-donut");
  const totalEl = document.getElementById("dashboard-status-total");
  const legend = document.getElementById("dashboard-status-legend");

  if (!donut || !totalEl || !legend) {
    console.warn("Elementos do gráfico de status não encontrados.");
    return;
  }

  const total = Array.isArray(reservas) ? reservas.length : 0;

  const confirmadas = reservas.filter(r => {
    const status = normalizarStatusReserva(r);
    return status === "CONFIRMADA" || status === "CONFIRMADO";
  }).length;

  const canceladas = reservas.filter(r => {
    const status = normalizarStatusReserva(r);
    return status === "CANCELADA" || status === "CANCELADO";
  }).length;

  const outras = Math.max(0, total - confirmadas - canceladas);

  totalEl.textContent = total;

  if (!total) {
    donut.style.background = "var(--surface-2)";
    legend.innerHTML = `
      <div class="grupo-empty">
        Nenhuma reserva encontrada.
      </div>
    `;
    return;
  }

  const pConfirmadas = (confirmadas / total) * 100;
  const pCanceladas = (canceladas / total) * 100;

  const fimConfirmadas = pConfirmadas;
  const fimCanceladas = pConfirmadas + pCanceladas;

  donut.style.background = `
    conic-gradient(
      var(--success, #22c55e) 0% ${fimConfirmadas}%,
      var(--error, #ef4444) ${fimConfirmadas}% ${fimCanceladas}%,
      var(--warning, #f59e0b) ${fimCanceladas}% 100%
    )
  `;

  legend.innerHTML = `
    <div class="dashboard-donut-legend-item">
      <div class="dashboard-donut-legend-left">
        <span class="dashboard-donut-dot" style="background:var(--success, #22c55e)"></span>
        <span>Confirmadas</span>
      </div>
      <strong>${confirmadas}</strong>
    </div>

    <div class="dashboard-donut-legend-item">
      <div class="dashboard-donut-legend-left">
        <span class="dashboard-donut-dot" style="background:var(--error, #ef4444)"></span>
        <span>Canceladas</span>
      </div>
      <strong>${canceladas}</strong>
    </div>

    <div class="dashboard-donut-legend-item">
      <div class="dashboard-donut-legend-left">
        <span class="dashboard-donut-dot" style="background:var(--warning, #f59e0b)"></span>
        <span>Outras</span>
      </div>
      <strong>${outras}</strong>
    </div>
  `;
}

function atualizarSalasMaisUsadas(reservas) {
  const chartCards = document.querySelectorAll(".chart-card");
  let cardSalas = null;

  chartCards.forEach(card => {
    const titulo = card.querySelector("h3")?.textContent?.trim();

    if (titulo === "Salas mais usadas") {
      cardSalas = card;
    }
  });

  if (!cardSalas) {
    console.warn("Card 'Salas mais usadas' não encontrado.");
    return;
  }

  const barChart = cardSalas.querySelector(".bar-chart");

  if (!barChart) {
    console.warn("Bar chart de salas mais usadas não encontrado.");
    return;
  }

  const contagem = {};

  reservas.forEach(reserva => {
    const status = normalizarStatusReserva(reserva);

    if (status === "CANCELADA" || status === "CANCELADO") {
      return;
    }

    const nome =
      reserva.nomeSala ||
      reserva.salaNome ||
      reserva.sala?.nome ||
      "Sala sem nome";

    contagem[nome] = (contagem[nome] || 0) + 1;
  });

  const ranking = Object.entries(contagem)
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);

  if (!ranking.length) {
    barChart.innerHTML = `
      <div class="grupo-empty">
        Nenhuma reserva encontrada.
      </div>
    `;
    return;
  }

  const maior = Math.max(...ranking.map(item => item.total));

  barChart.innerHTML = ranking.map(item => {
    const width = maior > 0
      ? Math.round((item.total / maior) * 100)
      : 0;

    return `
      <div class="bar-row">
        <span class="bar-label">${item.nome}</span>

        <div class="bar-track">
          <div class="bar-fill" data-width="${width}" style="width:${width}%"></div>
        </div>

        <span class="bar-value">${item.total}</span>
      </div>
    `;
  }).join("");
}

  function atualizarSalasMaisUsadas(reservas) {
  const chartCards = document.querySelectorAll(".chart-card");

  let cardSalasMaisUsadas = null;

  chartCards.forEach(card => {
    const titulo = card.querySelector("h3")?.textContent?.trim();

    if (titulo === "Salas mais usadas") {
      cardSalasMaisUsadas = card;
    }
  });

  if (!cardSalasMaisUsadas) {
    console.warn("Card 'Salas mais usadas' não encontrado.");
    return;
  }

  const barChart = cardSalasMaisUsadas.querySelector(".bar-chart");

  if (!barChart) {
    console.warn("Bar chart de salas mais usadas não encontrado.");
    return;
  }

  const contagem = {};

  reservas.forEach(reserva => {
    const status = reserva.statusReserva || reserva.status || "CONFIRMADA";

    if (status === "CANCELADA") return;

    const nomeSala =
      reserva.nomeSala ||
      reserva.salaNome ||
      reserva.sala?.nome ||
      "Sala sem nome";

    contagem[nomeSala] = (contagem[nomeSala] || 0) + 1;
  });

  const ranking = Object.entries(contagem)
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);

  if (!ranking.length) {
    barChart.innerHTML = `
      <div class="grupo-empty">
        Nenhuma reserva encontrada.
      </div>
    `;
    return;
  }

  const maior = Math.max(...ranking.map(item => item.total));

  barChart.innerHTML = ranking.map(item => {
    const porcentagem = maior > 0
      ? Math.round((item.total / maior) * 100)
      : 0;

    return `
      <div class="bar-row">
        <span class="bar-label">${item.nome}</span>

        <div class="bar-track">
          <div class="bar-fill" data-width="${porcentagem}" style="width:${porcentagem}%"></div>
        </div>

        <span class="bar-value">${item.total}</span>
      </div>
    `;
  }).join("");
}

  setTimeout(() => {
    if (getSafeRole() === "ADMIN") {
      carregarDashboardAdmin();
    }
  }, 700);
});