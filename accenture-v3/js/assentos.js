/* ══ assentos.js — assentos reais do backend ═══════════════════════ */
(function () {

  let filtrosAssentos = {
    dataReserva: getHojeISO(),
    horarioInicio: "10:00:00",
    horarioFim: "12:00:00"
  };

  function ensureFiltrosUI() {
    const container = document.getElementById('assentos-salas-container');

    if (!container) return;

    if (document.getElementById('assentos-filtros-backend')) return;

    const filtros = document.createElement('div');
    filtros.id = 'assentos-filtros-backend';
    filtros.style.cssText = `
      display:flex;
      gap:12px;
      flex-wrap:wrap;
      align-items:end;
      margin:16px 0 20px;
      padding:16px;
      border:1px solid var(--border);
      border-radius:16px;
      background:var(--surface);
    `;

    filtros.innerHTML = `
      <div class="field" style="min-width:180px">
        <label class="field-label">Data</label>
        <input type="date" class="field-input" id="assentos-data" value="${filtrosAssentos.dataReserva}">
      </div>

      <div class="field" style="min-width:150px">
        <label class="field-label">Início</label>
        <input type="time" class="field-input" id="assentos-inicio" value="${filtrosAssentos.horarioInicio.slice(0, 5)}">
      </div>

      <div class="field" style="min-width:150px">
        <label class="field-label">Fim</label>
        <input type="time" class="field-input" id="assentos-fim" value="${filtrosAssentos.horarioFim.slice(0, 5)}">
      </div>

      <button class="btn-primary" id="btn-carregar-assentos" type="button">
        Atualizar assentos
      </button>
    `;

    container.parentNode.insertBefore(filtros, container);

    document.getElementById('btn-carregar-assentos')?.addEventListener('click', async () => {
      filtrosAssentos = lerFiltros();

      await carregarAssentosBackend(true);
      renderAssentos();
    });
  }

  function lerFiltros() {
    const data = document.getElementById('assentos-data')?.value || getHojeISO();
    const inicio = document.getElementById('assentos-inicio')?.value || "10:00";
    const fim = document.getElementById('assentos-fim')?.value || "12:00";

    return {
      dataReserva: data,
      horarioInicio: normalizarHora(inicio),
      horarioFim: normalizarHora(fim)
    };
  }

  function normalizarHora(hora) {
    if (!hora) return "00:00:00";
    return hora.length === 5 ? `${hora}:00` : hora;
  }

  function formatarTipoAssento(tipo) {
  if (!tipo) return "Padrão";

  const nomes = {
    ESTACAO_PADRAO: "Estação padrão",
    ESTACAO_EXECUTIVA: "Executivo",
    SALA_REUNIAO_INDIVIDUAL: "Reunião",
    POSICAO_ACESSIVEL: "Acessível",
    HOT_DESK: "Hot desk",
    ESTACAO_DESIGN: "Design",
    ESTACAO_QA: "QA",
    ESTACAO_SUPORTE: "Suporte",
    ESTACAO_FLEX: "Flex"
  };

  return nomes[tipo] || tipo.replaceAll("_", " ").toLowerCase();
}

function formatarEquipamentos(equipamentos = []) {
  if (!equipamentos || !equipamentos.length) {
    return "";
  }

  const nomes = {
    COMPUTADOR_PC: "PC",
    COMPUTADOR_NOTEBOOK: "Notebook",
    MONITOR: "Monitor",
    MONITOR_4K: "4K",
    IMPRESSORA: "Impressora",
    SCANNER: "Scanner",
    RAMAL_TELEFONICO: "Ramal",
    TOMADA_ELETRICA: "Tomada",
    PONTO_DE_REDE: "Rede",
    HEADSET: "Headset",
    WEBCAM: "Webcam",
    TECLADO: "Teclado",
    MOUSE: "Mouse",
    DOCKING_STATION: "Dock"
  };

  return equipamentos
    .slice(0, 3)
    .map(eq => nomes[eq] || eq)
    .join(" · ");
}

  async function carregarAssentosBackend(force = false) {
    const container = document.getElementById('assentos-salas-container');

    if (container) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--text-muted)">
          Carregando assentos reais do backend...
        </div>
      `;
    }

    try {
      if (RF.syncSalasFromBackend) {
        await RF.syncSalasFromBackend(force);
      }

      await RF.syncAssentosTodasSalasFromBackend(filtrosAssentos);

    } catch (error) {
      console.error(error);

      showToast(
        'Erro ao carregar assentos',
        'Não foi possível buscar assentos no backend.',
        'error'
      );
    }
  }

  function updateStats() {
    const all = RF.getAssentos();
    const byState = { free: 0, reserved: 0, busy: 0 };

    all.forEach(a => {
      byState[a.state] = (byState[a.state] || 0) + 1;
    });

    const total = document.getElementById('stat-total');
    const free = document.getElementById('stat-free');
    const res = document.getElementById('stat-reserved');
    const busy = document.getElementById('stat-busy');

    if (total) total.textContent = all.length;
    if (free) free.textContent = byState.free || 0;
    if (res) res.textContent = byState.reserved || 0;
    if (busy) busy.textContent = byState.busy || 0;
  }

  function renderZone(salaId, zoneEl) {
  if (!zoneEl) return;

  const seats = RF.getAssentos()
    .filter(a => Number(a.salaId) === Number(salaId))
    .sort((a, b) => Number(a.posicao || 0) - Number(b.posicao || 0));

  if (!seats.length) {
    zoneEl.innerHTML = `
      <p style="color:var(--text-muted);padding:16px">
        Nenhum assento cadastrado para esta sala.
      </p>
    `;
    return;
  }

  zoneEl.innerHTML = seats.map(a => {
    const tipo = formatarTipoAssento(a.tipoAssento);
    const equipamentos = formatarEquipamentos(a.equipamentos);

    return `
      <button
        class="seat-btn ${a.state}"
        data-seat-id="${a.id}"
        data-state="${a.state}"
        title="Assento ${a.label} • ${tipo} • ${equipamentos || 'Sem equipamentos'}"
        ${a.state === 'busy' ? 'disabled' : ''}
        style="
          min-height:96px;
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

        <strong>${a.label}</strong>

        <span style="
          font-size:.62rem;
          line-height:1.1;
          opacity:.9;
          text-align:center;
          max-width:90px;
        ">
          ${tipo}
        </span>

        <span style="
          font-size:.58rem;
          line-height:1.1;
          opacity:.75;
          text-align:center;
          max-width:100px;
          white-space:normal;
        ">
          ${equipamentos || 'Sem eq.'}
        </span>
      </button>
    `;
  }).join('');

  zoneEl.addEventListener('click', e => {
    const btn = e.target.closest('.seat-btn');

    if (!btn || btn.dataset.state === 'busy') return;

    const id = btn.dataset.seatId;
    const next = btn.dataset.state === 'free' ? 'reserved' : 'free';

    RF.updateAssento(id, next);

    btn.dataset.state = next;
    btn.className = `seat-btn ${next}`;

    updateStats();

    const seat = RF.getAssentos().find(a => String(a.id) === String(id));

    showToast(
      next === 'reserved' ? 'Assento selecionado' : 'Seleção removida',
      seat ? `Assento ${seat.label} • ${formatarTipoAssento(seat.tipoAssento)}` : id,
      next === 'reserved' ? 'success' : 'info'
    );
  });
}
  function renderAssentos() {
    ensureFiltrosUI();

    const container = document.getElementById('assentos-salas-container');

    if (!container) return;

    const salas = RF.getSalas();

    if (!salas.length) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--text-muted)">
          <p>Nenhuma sala cadastrada.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = salas.map(sala => {
      const seats = RF.getAssentos()
        .filter(a => Number(a.salaId) === Number(sala.id));

      const free = seats.filter(a => a.state === 'free').length;
      const busy = seats.filter(a => a.state === 'busy').length;
      const res = seats.filter(a => a.state === 'reserved').length;

      const salaImg = RF.getSalaImg(sala.id) || sala.img || '';

      return `
        <div class="openspace-card" data-sala-card="${sala.id}">
          <div class="openspace-card-header">
            ${salaImg ? `<img src="${salaImg}" class="openspace-thumb" alt="${sala.name}" onerror="this.style.display='none'">` : ''}

            <div class="openspace-card-info">
              <h3>${sala.name}</h3>

              <div class="openspace-meta">
                <span>
                  <svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  ${sala.floor}
                </span>

                <span>
                  <svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2">
                    <rect x="3" y="7" width="18" height="10" rx="2"/>
                  </svg>
                  ${seats.length} assentos
                </span>

                <span class="badge badge--${sala.status}" style="font-size:.65rem">
                  ${{ green: 'Disponível', blue: 'Reservada', yellow: 'Manutenção' }[sala.status] || sala.status}
                </span>
              </div>

              <div style="display:flex;gap:12px;font-size:.75rem;margin-top:4px">
                <span style="color:var(--success)">● ${free} livres</span>
                <span style="color:var(--info)">● ${res} selecionados</span>
                <span style="color:var(--error)">● ${busy} ocupados</span>
              </div>
            </div>
          </div>

          <div class="seats-grid" id="seats-zona-${sala.id}"></div>

          <div class="seats-legend">
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
        </div>
      `;
    }).join('');

    salas.forEach(sala => {
      renderZone(sala.id, document.getElementById(`seats-zona-${sala.id}`));
    });

    updateStats();
  }

  window.initAssentos = async function () {
    ensureFiltrosUI();
    filtrosAssentos = lerFiltros();

    await carregarAssentosBackend(true);
    renderAssentos();
  };

  window.refreshAssentos = async function () {
    filtrosAssentos = lerFiltros();

    await carregarAssentosBackend(true);
    renderAssentos();
  };

})();