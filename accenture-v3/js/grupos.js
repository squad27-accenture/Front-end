/* ══ grupos.js — grupos reais + convites ═══════════════════════════ */
async function carregarConvites() {
  console.warn("carregarConvites ainda não implementado. Retornando lista vazia.");
  return [];
}

(function () {
  let grupos = [];
  let usuarios = [];
  let convites = [];
  let busca = "";
  let inicializado = false;

  function roleAtual() {
    return typeof getCurrentRole === "function" ? getCurrentRole() : "USER";
  }

  function isAdmin() {
    return roleAtual() === "ADMIN";
  }

  function isTechLeader() {
    return roleAtual() === "TECHLEADER";
  }

  function getMeuEmail() {
    return getSession?.()?.email || "";
  }

  function podeCriarGrupo() {
    return isAdmin() || isTechLeader();
  }

  function podeEditarGrupo(grupo) {
    if (isAdmin()) return true;

    const meuEmail = getMeuEmail();

    return grupo?.lider && grupo.lider.email === meuEmail;
  }

  function podeConvidarGrupo(grupo) {
    return podeEditarGrupo(grupo);
  }

  function abrirModal(id) {
    if (typeof openModal === "function") {
      openModal(id);
      return;
    }

    const modal = document.getElementById(id);

    if (modal) {
      modal.classList.add("open");
      modal.style.display = "flex";
    }
  }

  function fecharModal(id) {
    if (typeof closeModal === "function") {
      closeModal(id);
      return;
    }

    const modal = document.getElementById(id);

    if (modal) {
      modal.classList.remove("open");
      modal.style.display = "none";
    }
  }

  function normalizarUsuario(u) {
    return {
      id: u.id,
      nome: u.nome || u.username || u.name || u.email,
      email: u.email,
      role: u.role || "USER",
      tipoFuncionario: u.tipoFuncionario || "OUTRO"
    };
  }

  async function carregarGrupos() {
    console.log("Buscando grupos...");

    const response = await apiFetch("/grupos");

    console.log("Status /grupos:", response?.status);

    if (!response || !response.ok) {
      const texto = response ? await response.text() : "";
      console.error("Erro /grupos:", texto);
      throw new Error("Erro ao carregar grupos.");
    }

    grupos = await response.json();

    console.log("Grupos carregados:", grupos);

    return grupos;
  }

 async function carregarUsuarios() {
  if (!isAdmin()) {
    usuarios = [];
    return usuarios;
  }

  try {
    const token = typeof getAccessToken === "function"
      ? getAccessToken()
      : localStorage.getItem("rf_access_token");

    const response = await fetch(`${API_BASE_URL}/usuarios/listarUsuarios`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      const texto = await response.text().catch(() => "");

      console.warn(
        "Erro ao carregar usuários no grupos.js:",
        response.status,
        texto
      );

      usuarios = [];
      return usuarios;
    }

    const dados = await response.json();

    usuarios = Array.isArray(dados)
      ? dados.map(normalizarUsuario)
      : [];

    return usuarios;

  } catch (error) {
    console.warn("Erro ao carregar usuários no grupos.js:", error);

    usuarios = [];
    return usuarios;
  }
}
  function renderGrupos() {
    const grid = document.getElementById("grupos-grid");
    const count = document.getElementById("grupos-count");
    const actions = document.getElementById("grupos-actions");

    if (!grid) {
      console.error("Elemento #grupos-grid não encontrado no dashboard.html");
      return;
    }

    if (actions) {
      actions.style.display = podeCriarGrupo() ? "" : "none";
    }

    const q = busca.toLowerCase();

    const filtrados = grupos.filter(g => {
      return !q ||
        g.nome?.toLowerCase().includes(q) ||
        g.descricao?.toLowerCase().includes(q) ||
        g.lider?.nome?.toLowerCase().includes(q) ||
        g.lider?.email?.toLowerCase().includes(q);
    });

    if (count) {
      if (isAdmin()) {
        count.textContent = `${filtrados.length} grupo(s) cadastrados`;
      } else if (isTechLeader()) {
        count.textContent = `${filtrados.length} grupo(s) vinculado(s) a você`;
      } else {
        count.textContent = `${filtrados.length} grupo(s) em que você participa`;
      }
    }

    const htmlConvites = renderConvites();

    if (!filtrados.length) {
      grid.innerHTML = `
        ${htmlConvites}

        <div class="grupo-empty">
          Nenhum grupo encontrado.
        </div>
      `;
      wireGridButtons(grid);
      return;
    }

    grid.innerHTML = `
      ${htmlConvites}
      ${filtrados.map(grupo => renderGrupoCard(grupo)).join("")}
    `;

    wireGridButtons(grid);
  }

  function wireGridButtons(grid) {
  grid.querySelectorAll("[data-edit-grupo]").forEach(btn => {
    btn.addEventListener("click", () => abrirModalEditar(Number(btn.dataset.editGrupo)));
    grid.querySelectorAll("[data-toggle-membros-grupo]").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.toggleMembrosGrupo;
    const membros = grid.querySelector(`[data-membros-grupo="${id}"]`);

    if (!membros) return;

    const aberto = membros.classList.toggle("open");

    btn.textContent = aberto
      ? `Ocultar integrantes (${btn.dataset.totalMembros})`
      : `Ver integrantes (${btn.dataset.totalMembros})`;
  });
});
  });

  grid.querySelectorAll("[data-delete-grupo]").forEach(btn => {
    btn.addEventListener("click", () => deletarGrupo(Number(btn.dataset.deleteGrupo)));
  });

  grid.querySelectorAll("[data-convidar-grupo]").forEach(btn => {
    btn.addEventListener("click", () => abrirModalConvidar(Number(btn.dataset.convidarGrupo)));
  });

  grid.querySelectorAll("[data-aceitar-convite]").forEach(btn => {
    btn.addEventListener("click", () => responderConvite(Number(btn.dataset.aceitarConvite), "aceitar"));
  });

  grid.querySelectorAll("[data-recusar-convite]").forEach(btn => {
    btn.addEventListener("click", () => responderConvite(Number(btn.dataset.recusarConvite), "recusar"));
  });

  grid.querySelectorAll("[data-enviar-convite-inline]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const grupoId = Number(btn.dataset.enviarConviteInline);
      const input = grid.querySelector(`[data-convite-input="${grupoId}"]`);

      const email = input?.value.trim();

      if (!email) {
        mostrarToast("Informe o e-mail", "Digite o e-mail do convidado.", "error");
        return;
      }

      await convidarPorEmail(grupoId, email);

      if (input) {
        input.value = "";
      }
    });
  });
}

  function renderConvites() {
    if (!convites.length) {
      return "";
    }

    return `
      <div class="grupo-card" style="grid-column:1/-1;border-color:var(--accent)">
        <div class="grupo-card-header">
          <div>
            <h3>Convites pendentes</h3>
            <p>Você foi convidado para participar de grupo(s).</p>
          </div>

          <span class="badge badge--blue">
            ${convites.length} convite(s)
          </span>
        </div>

        <div class="grupo-membros">
          ${convites.map(convite => `
            <div class="grupo-membro">
              <div class="grupo-membro-avatar">
                ${(convite.grupoNome || "?")[0].toUpperCase()}
              </div>

              <div class="grupo-membro-info" style="flex:1">
                <strong>${convite.grupoNome}</strong>
                <small>Convidado por ${convite.convidadoPor || "—"}</small>
              </div>

              <div style="display:flex;gap:8px">
                <button class="btn-primary" type="button" data-aceitar-convite="${convite.id}">
                  Aceitar
                </button>

                <button class="btn-ghost" type="button" data-recusar-convite="${convite.id}">
                  Recusar
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

 function renderGrupoCard(grupo) {
  const lider = grupo.lider;
  const todosMembros = grupo.usuarios || [];

  const membros = todosMembros.filter(membro => {
    if (!lider) return true;

    const mesmoId = membro.id && lider.id && Number(membro.id) === Number(lider.id);
    const mesmoEmail = membro.email && lider.email && membro.email.toLowerCase() === lider.email.toLowerCase();

    return !mesmoId && !mesmoEmail;
  });

  const totalIntegrantes = lider ? membros.length + 1 : membros.length;

  const podeEditar = podeEditarGrupo(grupo);
  const podeConvidar = podeConvidarGrupo(grupo);
  const convitesPendentes = grupo.convitesPendentes || [];

  return `
    <div class="grupo-card grupo-card-clean">
      <div class="grupo-card-header grupo-card-header-clean">
        <div class="grupo-card-title-area">
          <h3>${grupo.nome}</h3>
          <p>${grupo.descricao || "Sem descrição"}</p>
        </div>

        <span class="grupo-count-pill">
          ${totalIntegrantes} integrante(s)
        </span>
      </div>

      <button
        type="button"
        class="btn-ghost grupo-toggle-membros"
        data-toggle-membros-grupo="${grupo.id}"
        data-total-membros="${totalIntegrantes}"
      >
        Ver integrantes
      </button>

      <div class="grupo-membros grupo-membros-collapsible" data-membros-grupo="${grupo.id}">
        ${
          lider
            ? `
              <div class="grupo-membro" style="border:1px solid var(--accent)">
                <div class="grupo-membro-avatar">
                  ${(lider.nome || lider.email || "?")[0].toUpperCase()}
                </div>

                <div class="grupo-membro-info">
                  <strong>${lider.nome || lider.email}</strong>
                  <small>${lider.email || ""} • Líder</small>
                </div>
              </div>
            `
            : ""
        }

        ${membros.map(m => `
          <div class="grupo-membro">
            <div class="grupo-membro-avatar">
              ${(m.nome || m.email || "?")[0].toUpperCase()}
            </div>

            <div class="grupo-membro-info">
              <strong>${m.nome || m.email}</strong>
              <small>${m.email || ""} • ${m.tipoFuncionario || "OUTRO"}</small>
            </div>
          </div>
        `).join("")}
      </div>

      ${
        podeConvidar
          ? `
            <div class="grupo-convite-box">
              <div class="grupo-convite-title">
                <strong>Convidar membro</strong>
                <small>O usuário entra somente após aceitar o convite.</small>
              </div>

              <div class="grupo-convite-form">
                <input
                  type="email"
                  class="field-input"
                  data-convite-input="${grupo.id}"
                  placeholder="email@empresa.com"
                />

                <button
                  type="button"
                  class="btn-primary"
                  data-enviar-convite-inline="${grupo.id}"
                >
                  Convidar
                </button>
              </div>
            </div>
          `
          : ""
      }

      ${
        convitesPendentes.length
          ? `
            <div class="grupo-convites-pendentes">
              <strong>Convites pendentes</strong>

              <div class="grupo-convites-lista">
                ${convitesPendentes.map(c => `
                  <div class="grupo-convite-item">
                    <div>
                      <span>${c.emailConvidado}</span>
                      <small>Convite pendente</small>
                    </div>

                    <span class="badge badge--blue">Pendente</span>
                  </div>
                `).join("")}
              </div>
            </div>
          `
          : ""
      }

      ${
        podeEditar
          ? `
            <div class="grupo-actions">
              <button class="action-btn" data-edit-grupo="${grupo.id}" title="Editar">
                <svg viewBox="0 0 24 24">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                </svg>
              </button>

              <button class="action-btn" data-delete-grupo="${grupo.id}" title="Remover">
                <svg viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>
              </button>
            </div>
          `
          : ""
      }
    </div>
  `;
}
  function renderLiderSelect(liderIdSelecionado = null) {
    const wrapper = document.getElementById("grupo-lider-wrapper");
    const select = document.getElementById("grupo-lider");

    if (!wrapper || !select) return;

    if (!isAdmin()) {
      wrapper.style.display = "none";
      select.innerHTML = "";
      return;
    }

    wrapper.style.display = "";

    select.innerHTML = `
      <option value="">Selecione o líder</option>

      ${usuarios.map(u => `
        <option value="${u.id}" ${Number(liderIdSelecionado) === Number(u.id) ? "selected" : ""}>
          ${u.nome} — ${u.email}
        </option>
      `).join("")}
    `;
  }

  function renderUsuariosModal(usuarioIdsSelecionados = []) {
    const wrapper = document.getElementById("grupo-usuarios-wrapper");
    const lista = document.getElementById("grupo-usuarios-lista");

    if (!wrapper || !lista) return;

    if (!isAdmin()) {
      wrapper.style.display = "none";
      lista.innerHTML = "";
      return;
    }

    wrapper.style.display = "";

    const ids = new Set(usuarioIdsSelecionados.map(Number));

    if (!usuarios.length) {
      lista.innerHTML = `
        <p style="color:var(--text-muted);padding:12px">
          Nenhum usuário disponível.
        </p>
      `;
      return;
    }

    lista.innerHTML = usuarios.map(u => `
      <label class="grupo-user-option">
        <input type="checkbox" value="${u.id}" ${ids.has(Number(u.id)) ? "checked" : ""}/>

        <div class="grupo-membro-avatar">
          ${(u.nome || u.email || "?")[0].toUpperCase()}
        </div>

        <div class="grupo-membro-info">
          <strong>${u.nome}</strong>
          <small>${u.email} • ${u.tipoFuncionario}</small>
        </div>
      </label>
    `).join("");
  }

  function configurarAreaConvite(grupo = null) {
    const wrapper = document.getElementById("grupo-convite-wrapper");
    const btn = document.getElementById("btn-enviar-convite-grupo");
    const input = document.getElementById("grupo-email-convite");

    if (!wrapper || !btn || !input) return;

    const podeMostrar = grupo && podeConvidarGrupo(grupo);

    wrapper.style.display = podeMostrar ? "" : "none";

    input.value = "";

    btn.onclick = async () => {
      if (!grupo) return;

      const email = input.value.trim();

      if (!email) {
        mostrarToast("Informe o e-mail", "Digite o e-mail do convidado.", "error");
        return;
      }

      await convidarPorEmail(grupo.id, email);

      input.value = "";
    };
  }

  function mostrarToast(titulo, mensagem, tipo = "info") {
    if (typeof showToast === "function") {
      showToast(titulo, mensagem, tipo);
    } else {
      console.log(`[${tipo}] ${titulo}: ${mensagem}`);
    }
  }

  function abrirModalNovo() {
    console.log("Abrindo modal de novo grupo...");

    if (!podeCriarGrupo()) {
      mostrarToast("Acesso negado", "Você não pode criar grupos.", "error");
      return;
    }

    const modal = document.getElementById("grupo-modal");
    const emailsConvite = document.getElementById("grupo-emails-convite-criacao");

  if (emailsConvite) {
    emailsConvite.value = "";
  }

    if (!modal) {
      console.error("Modal #grupo-modal não encontrado no dashboard.html");
      return;
    }

    document.getElementById("grupo-modal-title").textContent = "Novo Grupo";
    document.getElementById("grupo-id").value = "";
    document.getElementById("grupo-nome").value = "";
    document.getElementById("grupo-descricao").value = "";

    resetModalState();

    renderLiderSelect(null);
    renderUsuariosModal([]);
    configurarAreaConvite(null);

    abrirModal("grupo-modal");
  }

  function abrirModalEditar(id) {
    const grupo = grupos.find(g => Number(g.id) === Number(id));

    if (!grupo) return;

    if (!podeEditarGrupo(grupo)) {
      mostrarToast("Acesso negado", "Somente o líder ou admin pode editar o grupo.", "error");
      return;
    }

    document.getElementById("grupo-modal-title").textContent = "Editar Grupo";
    document.getElementById("grupo-id").value = grupo.id;
    document.getElementById("grupo-nome").value = grupo.nome || "";
    document.getElementById("grupo-descricao").value = grupo.descricao || "";

    resetModalState();

    renderLiderSelect(grupo.lider?.id);
    renderUsuariosModal((grupo.usuarios || []).map(u => u.id));
    configurarAreaConvite(grupo);

    abrirModal("grupo-modal");
  }

  function abrirModalConvidar(id) {
    const grupo = grupos.find(g => Number(g.id) === Number(id));

    if (!grupo) return;

    if (!podeConvidarGrupo(grupo)) {
      mostrarToast("Acesso negado", "Somente o líder ou admin pode convidar.", "error");
      return;
    }

    document.getElementById("grupo-modal-title").textContent = `Convidar para ${grupo.nome}`;
    document.getElementById("grupo-id").value = grupo.id;
    document.getElementById("grupo-nome").value = grupo.nome || "";
    document.getElementById("grupo-descricao").value = grupo.descricao || "";

    resetModalState();

    document.getElementById("grupo-nome").disabled = true;
    document.getElementById("grupo-descricao").disabled = true;

    renderLiderSelect(grupo.lider?.id);
    renderUsuariosModal((grupo.usuarios || []).map(u => u.id));
    configurarAreaConvite(grupo);

    const form = document.getElementById("grupo-form");

    if (form) {
      form.dataset.onlyInvite = "true";
    }

    abrirModal("grupo-modal");
  }

  function resetModalState() {
    const nome = document.getElementById("grupo-nome");
    const descricao = document.getElementById("grupo-descricao");
    const form = document.getElementById("grupo-form");

    if (nome) nome.disabled = false;
    if (descricao) descricao.disabled = false;
    if (form) delete form.dataset.onlyInvite;
  }

  async function convidarVariosEmails(grupoId, emails) {
  if (!emails || !emails.length) return;

  for (const email of emails) {
    const response = await apiFetch(`/grupos/${grupoId}/convites`, {
      method: "POST",
      body: JSON.stringify({ email })
    });

    if (!response || !response.ok) {
      const texto = response ? await response.text() : "";

      mostrarToast(
        "Erro ao convidar",
        `${email}: ${texto || "Não foi possível enviar convite."}`,
        "error"
      );

      continue;
    }
  }

  mostrarToast(
    "Convites enviados",
    `${emails.length} convite(s) enviado(s).`,
    "success"
  );
}


  function pegarEmailsConviteCriacao() {
  const value = document.getElementById("grupo-emails-convite-criacao")?.value || "";

  return value
    .split(",")
    .map(email => email.trim())
    .filter(Boolean);
}


  async function salvarGrupo(event) {
    event.preventDefault();

    const form = document.getElementById("grupo-form");

    if (form?.dataset.onlyInvite === "true") {
      fecharModal("grupo-modal");
      resetModalState();
      return;
    }

    const id = document.getElementById("grupo-id").value;
    const nome = document.getElementById("grupo-nome").value.trim();
    const descricao = document.getElementById("grupo-descricao").value.trim();

    if (!nome) {
      mostrarToast("Nome obrigatório", "Informe o nome do grupo.", "error");
      return;
    }

    let payload = {
      nome,
      descricao,
      liderId: null,
      usuarioIds: []
    };

    if (isAdmin()) {
      const liderId = Number(document.getElementById("grupo-lider").value || 0);

      const usuarioIds = Array.from(
        document.querySelectorAll("#grupo-usuarios-lista input[type='checkbox']:checked")
      ).map(input => Number(input.value));

      if (!liderId) {
        mostrarToast("Líder obrigatório", "Selecione o líder do grupo.", "error");
        return;
      }

      if (!usuarioIds.includes(liderId)) {
        usuarioIds.push(liderId);
      }

      payload.liderId = liderId;
      payload.usuarioIds = usuarioIds;
    }

    const response = await apiFetch(id ? `/grupos/${id}` : "/grupos", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });

    if (!response || !response.ok) {
      const texto = response ? await response.text() : "";
      mostrarToast("Erro ao salvar grupo", texto || "Não foi possível salvar.", "error");
      return;
    }

    let grupoSalvo = null;

try {
  grupoSalvo = await response.json();
} catch {
  grupoSalvo = null;
}

const emailsConvite = pegarEmailsConviteCriacao();

let grupoIdParaConvite = id ? Number(id) : grupoSalvo?.id;

if (!grupoIdParaConvite && !id) {
  try {
    await carregarGrupos();

    const encontrado = grupos
      .slice()
      .reverse()
      .find(g => g.nome === nome);

    grupoIdParaConvite = encontrado?.id;
  } catch (error) {
    console.warn("Não consegui buscar o grupo criado para enviar convites:", error);
  }
}

if (grupoIdParaConvite && emailsConvite.length) {
  await convidarVariosEmails(grupoIdParaConvite, emailsConvite);
}

    fecharModal("grupo-modal");
    resetModalState();

    mostrarToast(
      id ? "Grupo atualizado" : "Grupo criado",
      nome,
      "success"
    );

    await carregarTudo();
  }

  async function convidarPorEmail(grupoId, email) {
    const response = await apiFetch(`/grupos/${grupoId}/convites`, {
      method: "POST",
      body: JSON.stringify({ email })
    });

    if (!response || !response.ok) {
      const texto = response ? await response.text() : "";
      mostrarToast("Erro ao convidar", texto || "Não foi possível enviar convite.", "error");
      return;
    }

    mostrarToast("Convite enviado", email, "success");

    await carregarTudo();
  }

  async function deletarGrupo(id) {
    const grupo = grupos.find(g => Number(g.id) === Number(id));

    if (!grupo) return;

    if (!podeEditarGrupo(grupo)) {
      mostrarToast("Acesso negado", "Você não pode remover esse grupo.", "error");
      return;
    }

    if (!confirm(`Deseja remover o grupo "${grupo.nome}"?`)) {
      return;
    }

    const response = await apiFetch(`/grupos/${id}`, {
      method: "DELETE"
    });

    if (!response || !response.ok) {
      const texto = response ? await response.text() : "";
      mostrarToast("Erro ao remover grupo", texto || "Não foi possível remover.", "error");
      return;
    }

    mostrarToast("Grupo removido", grupo.nome, "info");

    await carregarTudo();
  }

  async function responderConvite(id, acao) {
    const response = await apiFetch(`/grupos/convites/${id}/${acao}`, {
      method: "POST"
    });

    if (!response || !response.ok) {
      const texto = response ? await response.text() : "";
      mostrarToast("Erro ao responder convite", texto || "Não foi possível responder.", "error");
      return;
    }

    mostrarToast(
      acao === "aceitar" ? "Convite aceito" : "Convite recusado",
      "",
      acao === "aceitar" ? "success" : "info"
    );

    await carregarTudo();
  }

  async function carregarTudo() {
    const grid = document.getElementById("grupos-grid");

    if (grid) {
      grid.innerHTML = `
        <div class="grupo-empty">
          Carregando grupos...
        </div>
      `;
    }

    try {
      await carregarGrupos();
      await carregarUsuarios();
      await carregarConvites();

      renderGrupos();
    } catch (error) {
      console.error(error);

      if (grid) {
        grid.innerHTML = `
          <div class="grupo-empty">
            Erro ao carregar grupos.
          </div>
        `;
      }

      mostrarToast("Erro", "Não foi possível carregar os grupos.", "error");
    }
  }

  window.initGrupos = async function () {
    console.log("initGrupos chamado.");

    const btnNovo = document.getElementById("btn-novo-grupo");

    if (btnNovo) {
      btnNovo.onclick = abrirModalNovo;
    } else {
      console.error("Botão #btn-novo-grupo não encontrado no dashboard.html");
    }

    const searchInput = document.getElementById("grupos-search-input");

    if (searchInput) {
      searchInput.oninput = e => {
        busca = e.target.value;
        renderGrupos();
      };
    }

    const form = document.getElementById("grupo-form");

    if (form) {
      form.onsubmit = salvarGrupo;
    } else {
      console.error("Form #grupo-form não encontrado no dashboard.html");
    }

    document.querySelectorAll('[data-modal-close="grupo-modal"]').forEach(btn => {
      btn.onclick = () => {
        resetModalState();
        fecharModal("grupo-modal");
      };
    });

    await carregarTudo();
  };

  function aplicarCollapseMembrosGrupos() {
  const grid = document.getElementById("grupos-grid");

  if (!grid) return;

  grid.querySelectorAll(".grupo-card").forEach(card => {
    const membros = card.querySelector(".grupo-membros");

    if (!membros) return;

    membros.classList.add("grupo-membros-collapsible");

    if (!membros.classList.contains("open")) {
      membros.classList.remove("open");
    }

    if (card.querySelector("[data-toggle-membros-grupo]")) {
      return;
    }

    const qtd = membros.querySelectorAll(".grupo-membro").length;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-ghost grupo-toggle-membros";
    btn.dataset.toggleMembrosGrupo = "true";
    btn.textContent = `Ver integrantes (${qtd})`;

    btn.addEventListener("click", () => {
      const aberto = membros.classList.toggle("open");

      btn.textContent = aberto
        ? `Ocultar integrantes (${qtd})`
        : `Ver integrantes (${qtd})`;
    });

    const header = card.querySelector(".grupo-card-header");

    if (header) {
      header.appendChild(btn);
    } else {
      membros.before(btn);
    }
  });
}

function observarCardsDeGrupos() {
  const grid = document.getElementById("grupos-grid");

  if (!grid || grid.dataset.collapseObserver === "true") return;

  grid.dataset.collapseObserver = "true";

  const observer = new MutationObserver(() => {
    aplicarCollapseMembrosGrupos();
  });

  observer.observe(grid, {
    childList: true,
    subtree: true
  });

  aplicarCollapseMembrosGrupos();
}

setTimeout(observarCardsDeGrupos, 300);
function instalarToggleIntegrantesGrupos() {
  if (window.__toggleIntegrantesGruposInstalado) return;

  window.__toggleIntegrantesGruposInstalado = true;

  document.addEventListener("click", event => {
    const btn = event.target.closest("[data-toggle-membros-grupo]");

    if (!btn) return;

    const grid = document.getElementById("grupos-grid");

    if (!grid || !grid.contains(btn)) return;

    event.preventDefault();
    event.stopPropagation();

    const grupoId = btn.getAttribute("data-toggle-membros-grupo");
    const total = btn.getAttribute("data-total-membros") || "0";

    const membros = grid.querySelector(`[data-membros-grupo="${grupoId}"]`);

    if (!membros) {
      console.warn("Lista de integrantes não encontrada para grupo:", grupoId);
      return;
    }

    const abriu = membros.classList.toggle("open");

    btn.textContent = abriu
      ? `Ocultar integrantes`
      : `Ver integrantes`;
  });
}

instalarToggleIntegrantesGrupos();

})();