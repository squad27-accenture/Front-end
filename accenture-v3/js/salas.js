/* ══ salas.js — salas + assentos estilo cinema ═════════════════════ */

(function () {
  let editingSalaId = null;
  let newPhotoData = null;
  let filterState = { search: '', status: '', cap: '' };
  let assentoSelecionadoModal = null;

  const STATUS_LABELS = {
    green: 'Disponível',
    blue: 'Reservada',
    yellow: 'Manutenção',
    red: 'Ocupada'
  };

  const RECURSOS_PRESET = [
    'TV 4K',
    'Monitor 4K',
    'PC Gamer',
    'Wi-Fi',
    'Webcam',
    'Projetor',
    'Quadro Branco',
    'Microfone',
    'Sistema de conferência',
    'Sistema de som',
    'Ar-condicionado',
    'Mesa redonda'
  ];

  function isAdmin() {
    return typeof getCurrentRole === 'function' && getCurrentRole() === 'ADMIN';
  }

  function toast(title, msg, type = 'info') {
    if (typeof showToast === 'function') {
      showToast(title, msg, type);
    } else {
      console.log(`[${type}] ${title}: ${msg}`);
    }
  }

  function abrirModal(id) {
    if (typeof openModal === 'function') {
      openModal(id);
      return;
    }

    const modal = document.getElementById(id);

    if (modal) {
      modal.classList.add('open');
      modal.style.display = 'flex';
    }
  }

  function fecharModal(id) {
    if (typeof closeModal === 'function') {
      closeModal(id);
      return;
    }

    const modal = document.getElementById(id);

    if (modal) {
      modal.classList.remove('open');
      modal.style.display = '';
    }
  }

  function esc(v) {
    return String(v ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function hojeISO() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
  }

  function normalizarHora(hora) {
    if (!hora) return '00:00:00';
    return hora.length === 5 ? `${hora}:00` : hora;
  }

  function getSalaImg(sala) {
    return RF.getSalaImg?.(sala.id) || sala.img || null;
  }

  function imgTag(sala, cls) {
    const src = getSalaImg(sala);

    if (src) {
      return `
        <img
          class="${cls}"
          src="${src}"
          alt="${esc(sala.name)}"
          onerror="this.style.display='none'"
        >
      `;
    }

    return `
      <div class="${cls}-placeholder">
        <svg viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
    `;
  }

  function aplicarPermissaoAdmin() {
    const btnNovaSala = document.getElementById('btn-nova-sala');

    if (btnNovaSala) {
      btnNovaSala.style.display = isAdmin() ? '' : 'none';
    }
  }

  function ensureSalaAssentosModal() {
  const modalAntigo = document.getElementById('sala-assentos-modal');

  if (modalAntigo) {
    modalAntigo.remove();
  }

  const modal = document.createElement('div');

  modal.className = 'modal-overlay';
  modal.id = 'sala-assentos-modal';

  modal.innerHTML = `
    <div class="modal modal-large" style="max-width:1200px;width:min(1200px,97vw);max-height:92vh;overflow:auto">
      <div class="modal-header">
        <div>
          <h3 id="sala-assentos-title">Assentos da sala</h3>
          <p id="sala-assentos-subtitle" style="color:var(--text-muted);font-size:.85rem;margin-top:4px">
            Escolha data e horário para ver disponibilidade
          </p>
        </div>

        <button class="modal-close" type="button" data-close-sala-assentos>
          <svg viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;align-items:end">
          <div class="field" style="min-width:160px">
            <label class="field-label">Data</label>
            <input type="date" class="field-input" id="sala-assentos-data">
          </div>

          <div class="field" style="min-width:130px">
            <label class="field-label">Início</label>
            <input type="time" class="field-input" id="sala-assentos-inicio" value="10:00">
          </div>

          <div class="field" style="min-width:130px">
            <label class="field-label">Fim</label>
            <input type="time" class="field-input" id="sala-assentos-fim" value="12:00">
          </div>

          <button type="button" class="btn-primary" id="btn-atualizar-assentos-sala">
            Atualizar assentos
          </button>
        </div>

        <div id="sala-assentos-info" style="margin-bottom:12px;color:var(--text-muted);font-size:.85rem"></div>

        <div class="seats-grid" id="sala-assentos-grid"></div>

        <div class="seats-legend" style="margin-top:18px">
          <div class="seats-legend-item">
            <span class="seats-legend-dot" style="background:var(--success)"></span>
            Livre
          </div>

          <div class="seats-legend-item">
            <span class="seats-legend-dot" style="background:var(--info)"></span>
            Selecionado
          </div>

          <div class="seats-legend-item">
            <span class="seats-legend-dot" style="background:var(--error)"></span>
            Ocupado
          </div>
        </div>

        <div style="
          position:sticky;
          bottom:0;
          margin-top:20px;
          padding:14px 0 0;
          background:var(--surface);
          border-top:1px solid var(--border);
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
        ">
          <div id="sala-assento-selecionado-info" style="color:var(--text-muted);font-size:.85rem">
            Nenhum assento selecionado.
          </div>

          <button type="button" class="btn-primary" id="btn-confirmar-reserva-sala" disabled>
            Reservar assento
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('[data-close-sala-assentos]')?.addEventListener('click', () => {
    fecharModal('sala-assentos-modal');
  });

  modal.addEventListener('click', event => {
    if (event.target === modal) {
      fecharModal('sala-assentos-modal');
    }
  });
}

  function renderSalas() {
    const grid = document.getElementById('salas-grid');
    const count = document.getElementById('salas-count');

    if (!grid) return;

    aplicarPermissaoAdmin();

    const q = filterState.search.toLowerCase();

    const salas = RF.getSalas().filter(sala => {
      const nome = sala.name || '';
      const tags = sala.tags || [];

      if (q && !nome.toLowerCase().includes(q) && !tags.join(' ').toLowerCase().includes(q)) {
        return false;
      }

      if (filterState.status && sala.status !== filterState.status) {
        return false;
      }

      if (filterState.cap === 'small' && sala.cap > 8) {
        return false;
      }

      if (filterState.cap === 'medium' && (sala.cap < 9 || sala.cap > 20)) {
        return false;
      }

      if (filterState.cap === 'large' && sala.cap < 21) {
        return false;
      }

      return true;
    });

    if (count) {
      count.textContent = `${salas.length} sala${salas.length !== 1 ? 's' : ''} encontrada${salas.length !== 1 ? 's' : ''}`;
    }

    if (!salas.length) {
      grid.innerHTML = `
        <p style="color:var(--text-muted);padding:24px">
          Nenhuma sala encontrada.
        </p>
      `;
      return;
    }

    grid.innerHTML = salas.map(sala => {
      const tags = sala.tags || [];
      const status = sala.status || 'green';

      return `
        <div class="room-card" data-open-sala-assentos="${sala.id}">
          <div class="room-card-img-wrap">
            ${imgTag(sala, 'room-card-img')}
          </div>

          <div class="room-card-body">
            <div class="room-card-top">
              <span class="badge badge--${status}">
                ${STATUS_LABELS[status] || status}
              </span>
            </div>

            <h3>${esc(sala.name)}</h3>

            <div class="room-card-meta">
              <span>
                <svg viewBox="0 0 24 24">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                ${esc(sala.floor || 'Local não informado')}
              </span>

              <span>
                <svg viewBox="0 0 24 24">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
                ${Number(sala.cap || 0)} pessoas
              </span>
            </div>

            <div class="room-tags">
              ${tags.slice(0, 3).map(tag => `
                <span class="room-tag">${esc(tag)}</span>
              `).join('')}

              ${
                tags.length > 3
                  ? `<span class="room-tag">+${tags.length - 3}</span>`
                  : ''
              }
            </div>

            <div style="margin-top:14px;display:flex;gap:8px;align-items:center;justify-content:space-between">
              <small style="color:var(--text-muted)">
                Clique para ver os assentos
              </small>

              ${
                isAdmin()
                  ? `
                    <div style="display:flex;gap:8px">
                      <button
                        type="button"
                        class="action-btn"
                        data-edit-sala="${sala.id}"
                        title="Editar sala"
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M12 20h9"/>
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                        </svg>
                      </button>

                      <button
                        type="button"
                        class="action-btn"
                        data-delete-sala="${sala.id}"
                        title="Excluir sala"
                      >
                        <svg viewBox="0 0 24 24">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        </svg>
                      </button>
                    </div>
                  `
                  : ''
              }
            </div>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('[data-open-sala-assentos]').forEach(card => {
      card.addEventListener('click', event => {
        if (event.target.closest('button')) return;

        const salaId = Number(card.dataset.openSalaAssentos);
        abrirAssentosDaSala(salaId);
      });
    });

    grid.querySelectorAll('[data-edit-sala]').forEach(btn => {
      btn.addEventListener('click', event => {
        event.stopPropagation();

        if (!isAdmin()) {
          toast('Acesso negado', 'Somente admin pode editar salas.', 'error');
          return;
        }

        openSalaForm(Number(btn.dataset.editSala));
      });
    });

    grid.querySelectorAll('[data-delete-sala]').forEach(btn => {
      btn.addEventListener('click', event => {
        event.stopPropagation();

        if (!isAdmin()) {
          toast('Acesso negado', 'Somente admin pode excluir salas.', 'error');
          return;
        }

        deletarSala(Number(btn.dataset.deleteSala));
      });
    });
  }

 async function abrirAssentosDaSala(salaId) {
  ensureSalaAssentosModal();

  assentoSelecionadoModal = null;

  const sala = RF.getSalas().find(s => Number(s.id) === Number(salaId));

  if (!sala) return;

  const dataInput = document.getElementById('sala-assentos-data');
  const inicioInput = document.getElementById('sala-assentos-inicio');
  const fimInput = document.getElementById('sala-assentos-fim');

  if (dataInput && !dataInput.value) dataInput.value = hojeISO();
  if (inicioInput && !inicioInput.value) inicioInput.value = '10:00';
  if (fimInput && !fimInput.value) fimInput.value = '12:00';

  const title = document.getElementById('sala-assentos-title');
  const subtitle = document.getElementById('sala-assentos-subtitle');
  const btnAtualizar = document.getElementById('btn-atualizar-assentos-sala');
  const btnReservar = document.getElementById('btn-confirmar-reserva-sala');
  const selectedInfo = document.getElementById('sala-assento-selecionado-info');

  if (title) title.textContent = sala.name || 'Sala';
  if (subtitle) subtitle.textContent = `${sala.floor || 'Local não informado'} • ${sala.cap || 0} lugares`;

  if (selectedInfo) selectedInfo.textContent = 'Nenhum assento selecionado.';

  if (btnReservar) {
    btnReservar.disabled = true;
    btnReservar.onclick = async () => {
      await reservarAssentoSelecionado(salaId);
    };
  }

  if (btnAtualizar) {
    btnAtualizar.onclick = async () => {
      assentoSelecionadoModal = null;

      if (selectedInfo) selectedInfo.textContent = 'Nenhum assento selecionado.';
      if (btnReservar) btnReservar.disabled = true;

      await carregarAssentosDaSalaNoModal(salaId);
    };
  }

  abrirModal('sala-assentos-modal');

  await carregarAssentosDaSalaNoModal(salaId);
}

  async function carregarAssentosDaSalaNoModal(salaId) {
    const grid = document.getElementById('sala-assentos-grid');
    const info = document.getElementById('sala-assentos-info');

    if (!grid) return;

    grid.innerHTML = `
      <p style="color:var(--text-muted);padding:20px">
        Carregando assentos...
      </p>
    `;

    const data = document.getElementById('sala-assentos-data')?.value || hojeISO();
    const inicio = document.getElementById('sala-assentos-inicio')?.value || '10:00';
    const fim = document.getElementById('sala-assentos-fim')?.value || '12:00';

    const filtros = {
      dataReserva: data,
      horarioInicio: normalizarHora(inicio),
      horarioFim: normalizarHora(fim)
    };

    try {
      if (!RF.syncAssentosSalaFromBackend) {
        throw new Error('RF.syncAssentosSalaFromBackend não existe.');
      }

      const assentos = await RF.syncAssentosSalaFromBackend(salaId, filtros);

      const livres = assentos.filter(a => a.state === 'free').length;
      const ocupados = assentos.filter(a => a.state === 'busy').length;

      if (info) {
        info.textContent = `${assentos.length} assento(s) encontrados • ${livres} livres • ${ocupados} ocupados`;
      }

      if (!assentos.length) {
        grid.innerHTML = `
          <p style="color:var(--text-muted);padding:20px">
            Nenhum assento cadastrado para esta sala.
          </p>
        `;
        return;
      }

      grid.innerHTML = assentos
        .sort((a, b) => Number(a.posicao || 0) - Number(b.posicao || 0))
        .map(assento => {
          const tipo = formatarTipoAssentoSala(assento.tipoAssento);
          const equipamentos = formatarEquipamentosSala(assento.equipamentos);

          return `
            <button
              class="seat-btn ${assento.state}"
              data-seat-id="${esc(assento.id)}"
              data-seat-label="${esc(assento.label)}"
              data-seat-posicao="${Number(assento.posicao)}"
              data-state="${assento.state}"
              ${assento.state === 'busy' ? 'disabled' : ''}
              title="Assento ${esc(assento.label)} • ${esc(tipo)} • ${esc(equipamentos || 'Sem equipamentos')}"
              style="
                min-height:104px;
                padding:8px 6px;
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:center;
                gap:4px;
              "
            >
              <svg viewBox="0 0 24 24">
                <rect x="3" y="7" width="18" height="10" rx="2"/>
                <path d="M5 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/>
                <path d="M5 17v2M19 17v2"/>
              </svg>

              <strong>${esc(assento.label)}</strong>

              <span style="font-size:.62rem;text-align:center;line-height:1.1">
                ${esc(tipo)}
              </span>

              <span style="font-size:.58rem;text-align:center;line-height:1.1;opacity:.75">
                ${esc(equipamentos || 'Sem eq.')}
              </span>
            </button>
          `;
        })
        .join('');

      grid.querySelectorAll('.seat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.state === 'busy') return;

    grid.querySelectorAll('.seat-btn.reserved').forEach(old => {
      old.classList.remove('reserved');
      old.classList.add('free');
      old.dataset.state = 'free';
    });

    btn.classList.remove('free');
    btn.classList.add('reserved');
    btn.dataset.state = 'reserved';

    assentoSelecionadoModal = {
      id: btn.dataset.seatId,
      label: btn.dataset.seatLabel,
      posicao: Number(btn.dataset.seatPosicao)
    };

    const selectedInfo = document.getElementById('sala-assento-selecionado-info');
    const btnReservar = document.getElementById('btn-confirmar-reserva-sala');

    if (selectedInfo) {
      selectedInfo.textContent = `Assento selecionado: ${assentoSelecionadoModal.label}`;
    }

    if (btnReservar) {
      btnReservar.disabled = false;
    }

    toast(
      'Assento selecionado',
      `Assento ${assentoSelecionadoModal.label}`,
      'success'
    );
  });
});
    } catch (error) {
      console.error(error);

      grid.innerHTML = `
        <p style="color:var(--error);padding:20px">
          Erro ao carregar assentos da sala.
        </p>
      `;
    }
  }
  async function reservarAssentoSelecionado(salaId) {
  if (!assentoSelecionadoModal) {
    toast('Nenhum assento selecionado', 'Escolha um assento livre para reservar.', 'error');
    return;
  }

  const data = document.getElementById('sala-assentos-data')?.value || hojeISO();
  const inicio = document.getElementById('sala-assentos-inicio')?.value || '10:00';
  const fim = document.getElementById('sala-assentos-fim')?.value || '12:00';

  const payload = {
    salaId: Number(salaId),
    posicaoAssento: Number(assentoSelecionadoModal.posicao),
    dataReserva: data,
    horarioInicio: normalizarHora(inicio),
    horarioFim: normalizarHora(fim)
  };

  const btnReservar = document.getElementById('btn-confirmar-reserva-sala');

  try {
    if (btnReservar) {
      btnReservar.disabled = true;
      btnReservar.textContent = 'Reservando...';
    }

    const response = await apiFetch('/reservas', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!response || !response.ok) {
      const texto = response ? await response.text() : '';

      toast(
        'Erro ao reservar',
        texto || 'Não foi possível salvar a reserva.',
        'error'
      );

      return;
    }

    toast(
      'Reserva confirmada',
      `Assento ${assentoSelecionadoModal.label} reservado com sucesso.`,
      'success'
    );

    assentoSelecionadoModal = null;

    const selectedInfo = document.getElementById('sala-assento-selecionado-info');

    if (selectedInfo) {
      selectedInfo.textContent = 'Nenhum assento selecionado.';
    }

    await carregarAssentosDaSalaNoModal(salaId);

    if (typeof window.refreshReservas === 'function') {
      window.refreshReservas();
    }

  } catch (error) {
    console.error(error);

    toast(
      'Erro ao reservar',
      'Falha ao comunicar com o servidor.',
      'error'
    );

  } finally {
    if (btnReservar) {
      btnReservar.textContent = 'Reservar assento';
      btnReservar.disabled = true;
    }
  }
}

  function formatarTipoAssentoSala(tipo) {
    if (!tipo) return 'Padrão';

    const nomes = {
      ESTACAO_PADRAO: 'Padrão',
      ESTACAO_EXECUTIVA: 'Executivo',
      SALA_REUNIAO_INDIVIDUAL: 'Reunião',
      POSICAO_ACESSIVEL: 'Acessível',
      HOT_DESK: 'Hot desk',
      PROGRAMADOR: 'Programador',
      DESIGNER: 'Designer',
      DESIGN: 'Designer',
      QA: 'QA',
      SUPORTE: 'Suporte',
      GESTOR: 'Gestor'
    };

    return nomes[tipo] || String(tipo).replaceAll('_', ' ').toLowerCase();
  }

  function formatarEquipamentosSala(equipamentos = []) {
    if (!equipamentos || !equipamentos.length) return '';

    const nomes = {
      COMPUTADOR_PC: 'PC',
      COMPUTADOR_NOTEBOOK: 'Notebook',
      NOTEBOOK: 'Notebook',
      MONITOR: 'Monitor',
      MONITOR_4K: '4K',
      IMPRESSORA: 'Impressora',
      SCANNER: 'Scanner',
      RAMAL_TELEFONICO: 'Ramal',
      TOMADA_ELETRICA: 'Tomada',
      PONTO_DE_REDE: 'Rede',
      HEADSET: 'Headset',
      WEBCAM: 'Webcam',
      TECLADO: 'Teclado',
      MOUSE: 'Mouse',
      DOCKING_STATION: 'Dock'
    };

    return equipamentos
      .slice(0, 3)
      .map(eq => {
        if (typeof eq === 'string') return nomes[eq] || eq;
        return nomes[eq?.tipo] || eq?.name || eq?.equipamento || eq?.tipo || String(eq);
      })
      .join(' · ');
  }

  function openDetail(id) {
    abrirAssentosDaSala(id);
  }

  function deletarSala(id) {
    if (!isAdmin()) {
      toast('Acesso negado', 'Somente admin pode excluir salas.', 'error');
      return;
    }

    const sala = RF.getSalas().find(s => Number(s.id) === Number(id));

    if (!sala) return;

    if (!confirm(`Deseja excluir a sala "${sala.name}"?`)) {
      return;
    }

    RF.deleteSala(id);
    RF.deleteSalaImg?.(id);
    RF.deleteSalaAssentos?.(id);

    renderSalas();

    if (window.refreshAssentos) {
      window.refreshAssentos();
    }

    toast('Sala excluída', sala.name, 'info');
  }

  function openSalaForm(id) {
    if (!isAdmin()) {
      toast('Acesso negado', 'Somente admin pode criar ou editar salas.', 'error');
      return;
    }

    editingSalaId = id || null;
    newPhotoData = null;

    const sala = id ? RF.getSalas().find(x => Number(x.id) === Number(id)) : null;

    const title = document.getElementById('nova-sala-title');
    const name = document.getElementById('sala-form-name');
    const cap = document.getElementById('sala-form-cap');
    const floor = document.getElementById('sala-form-floor');
    const status = document.getElementById('sala-form-status');
    const submit = document.getElementById('sala-form-submit');

    if (title) title.textContent = sala ? 'Editar Sala' : 'Nova Sala';
    if (name) name.value = sala?.name || '';
    if (cap) cap.value = sala?.cap || 4;
    if (floor) floor.value = sala?.floor || '';
    if (status) status.value = sala?.status || 'green';
    if (submit) submit.textContent = sala ? 'Salvar alterações' : 'Cadastrar';

    renderRecursosChips(sala?.tags || []);

    const preview = document.getElementById('foto-preview-wrap');

    if (preview) {
      const src = sala ? getSalaImg(sala) : null;
      updateFotoPreview(src, preview);
    }

    abrirModal('nova-sala-modal');
  }

  function renderRecursosChips(selectedTags) {
    const wrap = document.getElementById('recursos-chips-wrap');

    if (!wrap) return;

    wrap.innerHTML = RECURSOS_PRESET.map(recurso => `
      <button
        type="button"
        class="recurso-chip${selectedTags.includes(recurso) ? ' selected' : ''}"
        data-recurso="${esc(recurso)}"
      >
        ${esc(recurso)}
      </button>
    `).join('') + `
      <button type="button" class="recurso-chip recurso-outro" id="recurso-outro-btn">
        + Outro
      </button>
    `;

    wrap.querySelectorAll('.recurso-chip[data-recurso]').forEach(chip => {
      chip.onclick = () => {
        chip.classList.toggle('selected');
      };
    });

    const outroBtn = document.getElementById('recurso-outro-btn');
    const outroInput = document.getElementById('recurso-outro-input');

    if (outroBtn && outroInput) {
      outroBtn.onclick = () => {
        outroInput.style.display = outroInput.style.display === 'none' ? '' : 'none';

        if (outroInput.style.display !== 'none') {
          outroInput.focus();
        }
      };

      outroInput.onkeydown = event => {
        if (event.key === 'Enter') {
          event.preventDefault();

          const val = event.target.value.trim();

          if (val) {
            const newChip = document.createElement('button');

            newChip.type = 'button';
            newChip.className = 'recurso-chip selected';
            newChip.dataset.recurso = val;
            newChip.textContent = val;
            newChip.onclick = () => newChip.classList.toggle('selected');

            wrap.insertBefore(newChip, outroBtn);

            event.target.value = '';
          }
        }
      };
    }
  }

  function getSelectedRecursos() {
    return [...document.querySelectorAll('#recursos-chips-wrap .recurso-chip.selected[data-recurso]')]
      .map(chip => chip.dataset.recurso);
  }

  function updateFotoPreview(src, wrap) {
    if (!wrap) return;

    if (src) {
      wrap.innerHTML = `
        <img class="foto-preview" src="${src}">
        <p style="font-size:.75rem;color:var(--success)">
          ✓ Foto carregada — clique para trocar
        </p>
      `;

      wrap.classList.add('has-photo');
      return;
    }

    wrap.innerHTML = `
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>

      <strong>Adicionar foto</strong>
      <p>Clique ou arraste uma imagem (JPG, PNG)</p>
    `;

    wrap.classList.remove('has-photo');
  }

  function wireFotoUpload() {
    const area = document.getElementById('foto-preview-wrap');
    const input = document.getElementById('sala-foto-input');

    if (!area || !input) return;

    area.onclick = () => input.click();

    area.ondragover = event => {
      event.preventDefault();
      area.style.borderColor = 'var(--accent)';
    };

    area.ondragleave = () => {
      area.style.borderColor = '';
    };

    area.ondrop = event => {
      event.preventDefault();
      area.style.borderColor = '';
      processFile(event.dataTransfer.files[0]);
    };

    input.onchange = () => {
      processFile(input.files[0]);
    };

    function processFile(file) {
      if (!file || !file.type.startsWith('image/')) {
        toast('Arquivo inválido', 'Use JPG ou PNG.', 'error');
        return;
      }

      const reader = new FileReader();

      reader.onload = event => {
        newPhotoData = event.target.result;
        updateFotoPreview(newPhotoData, area);
      };

      reader.readAsDataURL(file);
    }
  }

  function wireForm() {
    const form = document.getElementById('sala-form');

    if (!form) return;

    form.onsubmit = event => {
      event.preventDefault();

      if (!isAdmin()) {
        toast('Acesso negado', 'Somente admin pode salvar salas.', 'error');
        return;
      }

      const name = document.getElementById('sala-form-name')?.value.trim();
      const cap = parseInt(document.getElementById('sala-form-cap')?.value) || 4;
      const floor = document.getElementById('sala-form-floor')?.value.trim();
      const status = document.getElementById('sala-form-status')?.value || 'green';
      const tags = getSelectedRecursos();

      if (!name) {
        toast('Campo obrigatório', 'Informe o nome da sala.', 'error');
        return;
      }

      if (editingSalaId) {
        RF.updateSala(editingSalaId, {
          name,
          cap,
          floor,
          tags,
          status
        });

        if (newPhotoData) {
          RF.setSalaImg?.(editingSalaId, newPhotoData);
        }

        toast('Sala atualizada', name, 'success');
      } else {
        const nova = RF.addSala({
          name,
          cap,
          floor,
          tags,
          status,
          img: null
        });

        if (newPhotoData) {
          RF.setSalaImg?.(nova.id, newPhotoData);
        }

        RF.initSalaAssentos?.(nova.id, nova.name, cap);

        toast('Sala criada', name, 'success');
      }

      fecharModal('nova-sala-modal');
      renderSalas();

      if (window.refreshAssentos) {
        window.refreshAssentos();
      }
    };
  }

  function wireFilters() {
    document.getElementById('salas-search-input')?.addEventListener('input', event => {
      filterState.search = event.target.value;
      renderSalas();
    });

    document.getElementById('filter-status')?.addEventListener('change', event => {
      filterState.status = event.target.value;
      renderSalas();
    });

    document.getElementById('filter-cap')?.addEventListener('change', event => {
      filterState.cap = event.target.value;
      renderSalas();
    });

    const btnNovaSala = document.getElementById('btn-nova-sala');

    if (btnNovaSala) {
      btnNovaSala.onclick = () => openSalaForm(null);
    }
  }

  window.initSalas = async function () {
    ensureSalaAssentosModal();
    aplicarPermissaoAdmin();

    const grid = document.getElementById('salas-grid');

    if (grid) {
      grid.innerHTML = `
        <p style="color:var(--text-muted);padding:24px">
          Carregando salas do backend...
        </p>
      `;
    }

    try {
      await RF.syncSalasFromBackend?.(true);
    } catch (error) {
      console.error(error);

      toast(
        'Erro ao carregar salas',
        'Não foi possível buscar salas no backend. Usando dados locais.',
        'error'
      );
    }

    renderSalas();
    wireFilters();
    wireFotoUpload();
    wireForm();
  };

  window.refreshSalas = renderSalas;
})();