/* ══ reservas.js — reservas reais do backend ═══════════════════════ */

(function () {
  let reservas = [];
  let reservaParaCancelar = null;
  let filtrosReservas = {
  inicio: "",
  fim: "",
  status: ""
};

let filtrosReservasLigados = false;

  function toast(title, msg, type = 'info') {
    if (typeof showToast === 'function') {
      showToast(title, msg, type);
    } else {
      console.log(`[${type}] ${title}: ${msg}`);
    }
  }

  function formatarData(data) {
    if (!data) return '—';

    const [ano, mes, dia] = String(data).split('-');

    if (!ano || !mes || !dia) return data;

    return `${dia}/${mes}/${ano}`;
  }

  function formatarHora(hora) {
    if (!hora) return '—';
    return String(hora).slice(0, 5);
  }

  function statusBadge(status) {
    const s = status || 'CONFIRMADA';

    if (s === 'CANCELADA') return 'badge--red';
    if (s === 'CONFIRMADA') return 'badge--green';

    return 'badge--blue';
  }

  function normalizarStatusReserva(status) {
  return String(status || "CONFIRMADA").toUpperCase();
}

function reservasFiltradas() {
  return reservas.filter(r => {
    const data = r.dataReserva || "";
    const status = normalizarStatusReserva(r.statusReserva || r.status);

    if (filtrosReservas.inicio && data < filtrosReservas.inicio) {
      return false;
    }

    if (filtrosReservas.fim && data > filtrosReservas.fim) {
      return false;
    }

    if (filtrosReservas.status && status !== filtrosReservas.status) {
      return false;
    }

    return true;
  });
}

function wireFiltrosReservas() {
  if (filtrosReservasLigados) return;

  filtrosReservasLigados = true;

  const inicio = document.getElementById("reservas-filter-inicio");
  const fim = document.getElementById("reservas-filter-fim");
  const status = document.getElementById("reservas-filter-status");
  const limpar = document.getElementById("reservas-filter-clear");

  if (inicio) {
    inicio.addEventListener("change", () => {
      filtrosReservas.inicio = inicio.value;
      renderReservas();
    });
  }

  if (fim) {
    fim.addEventListener("change", () => {
      filtrosReservas.fim = fim.value;
      renderReservas();
    });
  }

  if (status) {
    status.addEventListener("change", () => {
      filtrosReservas.status = status.value;
      renderReservas();
    });
  }

  if (limpar) {
    limpar.addEventListener("click", () => {
      filtrosReservas = {
        inicio: "",
        fim: "",
        status: ""
      };

      if (inicio) inicio.value = "";
      if (fim) fim.value = "";
      if (status) status.value = "";

      renderReservas();
    });
  }
}

  function ensureCancelReservaModal() {
  if (document.getElementById('cancel-reserva-modal')) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'cancel-reserva-modal';

  modal.innerHTML = `
    <div class="modal cancel-reserva-modal">
      <div class="cancel-reserva-icon">
        <svg viewBox="0 0 24 24">
          <path d="M12 9v4"/>
          <path d="M12 17h.01"/>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        </svg>
      </div>

      <div class="cancel-reserva-content">
        <h3>Cancelar reserva?</h3>
        <p id="cancel-reserva-desc">
          Essa ação vai cancelar sua reserva e liberar o assento para outras pessoas.
        </p>
      </div>

      <div class="field">
        <label class="field-label">Motivo do cancelamento</label>
        <textarea
          id="cancel-reserva-motivo"
          class="field-input"
          rows="3"
          placeholder="Ex: Não vou mais precisar da sala"
        ></textarea>
      </div>

      <div class="cancel-reserva-actions">
        <button type="button" class="btn-ghost" id="btn-fechar-cancel-reserva">
          Voltar
        </button>

        <button type="button" class="btn-danger-custom" id="btn-confirmar-cancel-reserva">
          Cancelar reserva
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener('click', event => {
    if (event.target === modal) {
      fecharModalCancelarReserva();
    }
  });

  document.getElementById('btn-fechar-cancel-reserva')?.addEventListener('click', fecharModalCancelarReserva);

  document.getElementById('btn-confirmar-cancel-reserva')?.addEventListener('click', async () => {
    if (!reservaParaCancelar) return;

    const motivo = document.getElementById('cancel-reserva-motivo')?.value.trim()
      || 'Cancelada pelo usuário';

    await cancelarReserva(reservaParaCancelar.id, motivo);

    fecharModalCancelarReserva();
  });
}

function abrirModalCancelarReserva(id) {
  const reserva = reservas.find(r => Number(r.id) === Number(id));

  if (!reserva) return;

  reservaParaCancelar = reserva;

  ensureCancelReservaModal();

  const desc = document.getElementById('cancel-reserva-desc');
  const motivo = document.getElementById('cancel-reserva-motivo');

  if (desc) {
    desc.innerHTML = `
      Você está cancelando a reserva em
      <strong>${reserva.nomeSala || reserva.salaNome || 'Sala'}</strong>,
      no dia <strong>${formatarData(reserva.dataReserva)}</strong>,
      das <strong>${formatarHora(reserva.horarioInicio)} às ${formatarHora(reserva.horarioFim)}</strong>.
      O assento será liberado para outras pessoas.
    `;
  }

  if (motivo) {
    motivo.value = '';
  }

  const modal = document.getElementById('cancel-reserva-modal');

  if (modal) {
    modal.classList.add('open');
    modal.style.display = 'flex';
  }
}

function fecharModalCancelarReserva() {
  const modal = document.getElementById('cancel-reserva-modal');

  if (modal) {
    modal.classList.remove('open');
    modal.style.display = '';
  }

  reservaParaCancelar = null;
}

  async function carregarReservasBackend() {
    const response = await apiFetch('/reservas/historico');

    if (!response || !response.ok) {
      const texto = response ? await response.text() : '';
      throw new Error(texto || 'Erro ao buscar reservas.');
    }

    reservas = await response.json();

    return reservas;
  }

  function acharContainerReservas() {
  const containerVisivel =
    document.getElementById('reservas-container') ||
    document.querySelector('[data-reservas-list]') ||
    document.getElementById('reservas-list') ||
    document.getElementById('reservas-grid') ||
    document.getElementById('reservas-timeline');

  if (containerVisivel) {
    containerVisivel.style.display = '';
    return containerVisivel;
  }

  const viewWrap = document.getElementById('reservas-view-wrap');

  if (viewWrap) {
    viewWrap.style.display = '';
    return viewWrap;
  }

  return null;
}

  function acharTabelaReservas() {
    return (
      document.getElementById('reservas-tbody') ||
      document.getElementById('reservas-table-body')
    );
  }

 function renderReservas() {
  const tbody = acharTabelaReservas();
  const container = acharContainerReservas();
  const count = document.getElementById('reservas-count');

  const lista = reservasFiltradas();

  if (count) {
    count.textContent = `${lista.length} reserva${lista.length !== 1 ? 's' : ''}`;
  }

  if (tbody) {
    renderTabela(tbody, lista);
    return;
  }

  if (container) {
    renderCards(container, lista);
    return;
  }

  console.warn('Nenhum container de reservas encontrado no HTML.');
}

  function renderTabela(tbody, lista = reservasFiltradas()) {
    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">
            Nenhuma reserva encontrada.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map(r => `
      <tr>
        <td>
          <strong>${r.nomeSala || r.salaNome || 'Sala'}</strong>
          <small style="display:block;color:var(--text-muted)">
            Assento ${r.posicaoAssento || '—'}
          </small>
        </td>

        <td>${formatarData(r.dataReserva)}</td>

        <td>${formatarHora(r.horarioInicio)} - ${formatarHora(r.horarioFim)}</td>

        <td>
          <span class="badge ${statusBadge(r.statusReserva)}">
            ${r.statusReserva || 'CONFIRMADA'}
          </span>
        </td>

        <td>${r.codigoGrupo || 'Individual'}</td>

        <td>
          ${
            r.statusReserva !== 'CANCELADA'
              ? `
                <button class="action-btn" data-cancelar-reserva="${r.id}" title="Cancelar">
                  <svg viewBox="0 0 24 24">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              `
              : ''
          }
        </td>
      </tr>
    `).join('');

    wireCancelar(tbody);
  }

  function renderCards(container, lista = reservasFiltradas()) {
  if (!lista.length) {
    container.innerHTML = `
      <div class="grupo-empty">
        Nenhuma reserva encontrada.
      </div>
    `;
    return;
  }

  container.innerHTML = lista.map(r => {
    const status = normalizarStatusReserva(r.statusReserva || r.status);
    const cancelada = status === "CANCELADA" || status === "CANCELADO";

    return `
      <div class="grupo-card reserva-card">
        <div class="reserva-card-main">
          <div class="reserva-card-icon">
            ${(r.nomeSala || r.salaNome || 'S')[0].toUpperCase()}
          </div>

          <div class="reserva-card-info">
            <div class="reserva-card-topline">
              <h3>${r.nomeSala || r.salaNome || 'Sala'}</h3>

              <span class="badge ${statusBadge(status)}">
                ${status}
              </span>
            </div>

            <div class="reserva-card-meta">
              <span>${formatarData(r.dataReserva)}</span>
              <span>${formatarHora(r.horarioInicio)} - ${formatarHora(r.horarioFim)}</span>
              <span>Assento ${r.posicaoAssento || '—'}</span>
              <span>${r.codigoGrupo ? `Grupo ${r.codigoGrupo}` : 'Individual'}</span>
            </div>
          </div>
        </div>

        ${
          !cancelada
            ? `
              <button class="reserva-cancel-btn" data-cancelar-reserva="${r.id}">
                Cancelar
              </button>
            `
            : ''
        }
      </div>
    `;
  }).join('');

  wireCancelar(container);
}

  function wireCancelar(root) {
  root.querySelectorAll('[data-cancelar-reserva]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.cancelarReserva);
      abrirModalCancelarReserva(id);
    });
  });
}

  async function cancelarReserva(id, motivo = 'Cancelada pelo usuário') {
  const btn = document.getElementById('btn-confirmar-cancel-reserva');

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Cancelando...';
    }

    const response = await apiFetch(`/reservas/${id}/cancelar?motivo=${encodeURIComponent(motivo)}`, {
      method: 'PUT'
    });

    if (!response || !response.ok) {
      const texto = response ? await response.text() : '';

      toast(
        'Erro ao cancelar',
        texto || 'Não foi possível cancelar a reserva.',
        'error'
      );

      return;
    }

    toast(
      'Reserva cancelada',
      'O assento foi liberado com sucesso.',
      'success'
    );

    await carregarTudo();

  } catch (error) {
    console.error(error);

    toast(
      'Erro ao cancelar',
      'Falha ao comunicar com o servidor.',
      'error'
    );

  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Cancelar reserva';
    }
  }
}

  async function carregarTudo() {
    const container = acharContainerReservas();
    const tbody = acharTabelaReservas();

    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">
            Carregando reservas...
          </td>
        </tr>
      `;
    }

    if (container) {
      container.innerHTML = `
        <div class="grupo-empty">
          Carregando reservas...
        </div>
      `;
    }

    try {
      await carregarReservasBackend();
      renderReservas();

    } catch (error) {
      console.error(error);

      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center;color:var(--error);padding:24px">
              Erro ao carregar reservas.
            </td>
          </tr>
        `;
      }

      if (container) {
        container.innerHTML = `
          <div class="grupo-empty">
            Erro ao carregar reservas.
          </div>
        `;
      }

      toast('Erro', 'Não foi possível carregar suas reservas.', 'error');
    }
  }
window.initReservas = async function () {
  wireFiltrosReservas();
  await carregarTudo();
};

  window.refreshReservas = carregarTudo;
})();