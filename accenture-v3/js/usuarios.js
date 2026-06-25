/* ══ usuarios.js — usuários reais do backend ═══════════════════════ */
(function () {
  const ROLE_LABELS = {
    ADMIN: 'Admin',
    TECHLEADER: 'Tech Lead',
    USER: 'Usuário'
  };

  let usersSearch = '';
  let usuarios = [];

  function normalizarUsuario(u) {
    return {
      id: u.id,
      name: u.nome || u.username || u.name || u.email,
      email: u.email,
      team: u.tipoFuncionario || 'OUTRO',
      role: u.role || 'USER',
      status: 'Ativo'
    };
  }

  async function carregarUsuariosBackend() {
    const response = await apiFetch("/usuarios");

    if (!response || !response.ok) {
      throw new Error("Erro ao buscar usuários.");
    }

    const dados = await response.json();

    usuarios = dados.map(normalizarUsuario);

    RF.setUsuarios(usuarios);

    return usuarios;
  }

  function roleClass(role) {
    if (role === "ADMIN") return "admin";
    if (role === "TECHLEADER") return "lead";
    return "user";
  }

  function renderUsers() {
    const tbody = document.getElementById('users-tbody');
    const count = document.getElementById('users-count');

    if (!tbody) return;

    const q = usersSearch.toLowerCase();

    const filtered = usuarios.filter(u =>
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );

    if (count) {
      count.textContent = `${usuarios.length} usuários no sistema`;
    }

    if (!filtered.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">
            Nenhum usuário encontrado.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(u => `
      <tr>
        <td>
          <div class="user-cell">
            <div class="user-avatar">${(u.name || '?')[0].toUpperCase()}</div>
            <div>
              <strong>${u.name}</strong>
              <small>${u.email}</small>
            </div>
          </div>
        </td>

        <td>${u.team || '—'}</td>

        <td>
          <span class="role-badge ${roleClass(u.role)}">
            ${ROLE_LABELS[u.role] || u.role}
          </span>
        </td>

        <td>
          <span class="badge badge--green">${u.status}</span>
        </td>

        <td>
          <button class="action-btn" data-delete-user="${u.id}" title="Remover">
            <svg viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-delete-user]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.deleteUser);
        const u = usuarios.find(x => Number(x.id) === id);

        if (!confirm(`Deseja remover ${u?.name || 'este usuário'}?`)) {
          return;
        }

        const response = await apiFetch(`/usuarios/${id}`, {
          method: "DELETE"
        });

        if (!response || !response.ok) {
          const texto = response ? await response.text() : "";
          showToast("Erro ao remover usuário", texto || "Não foi possível remover.", "error");
          return;
        }

        showToast('Usuário removido', u?.name || '', 'info');

        await carregarUsuariosBackend();
        renderUsers();
      });
    });
  }

  window.initUsuarios = async function () {
    const tbody = document.getElementById('users-tbody');

    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">
            Carregando usuários...
          </td>
        </tr>
      `;
    }

    try {
      await carregarUsuariosBackend();
      renderUsers();
    } catch (error) {
      console.error(error);

      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">
              Erro ao carregar usuários.
            </td>
          </tr>
        `;
      }

      showToast("Erro", "Não foi possível carregar usuários do backend.", "error");
    }

    document.getElementById('users-search-input')?.addEventListener('input', e => {
      usersSearch = e.target.value;
      renderUsers();
    });

    document.getElementById('novo-usuario-form')?.addEventListener('submit', e => {
      e.preventDefault();
      showToast("Cadastro pelo admin", "Vamos conectar essa parte depois.", "info");
    });
  };
})();