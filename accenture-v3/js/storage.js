/* ══ storage.js — sistema central de dados persistentes ══════════════
   Todas as seções lêem/gravam aqui. Usa localStorage.
   Dados: salas, reservas, usuarios, assentos, configurações de conta.
   ══════════════════════════════════════════════════════════════════ */

const RF = {

  /* ── helpers ───────────────────────────────────────────────────── */
  _get(k)    { try { return JSON.parse(localStorage.getItem('rf_' + k)); } catch { return null; } },
  _set(k, v) { localStorage.setItem('rf_' + k, JSON.stringify(v)); },

  /* ── SALAS ─────────────────────────────────────────────────────── */
  getSalas() {
    const saved = this._get('salas');
    if (saved) return saved;

    const defaults = [
      { id:1, name:'Sala Olimpo', status:'green',  floor:'Andar 5 - Bloco A', cap:12, tags:['TV 4K','Webcam','Quadro Branco','Wi-Fi'], img:'../assets/sala-olimpo.jpg' },
      { id:2, name:'Sala Aurora', status:'blue',   floor:'Andar 3 - Bloco B', cap:6,  tags:['TV','Sistema de conferência','Wi-Fi'],      img:'../assets/sala-aurora.jpg' },
      { id:3, name:'Sala Pégaso', status:'green',  floor:'Andar 7 - Bloco C', cap:20, tags:['Projetor','Sistema de som','Wi-Fi'],        img:'../assets/sala-pegaso.jpg' },
      { id:4, name:'Sala Hermes', status:'yellow', floor:'Andar 2 - Bloco D', cap:4,  tags:['TV','Quadro Branco'],                       img:'../assets/sala-hermes.jpg' },
      { id:5, name:'Sala Atlas',  status:'green',  floor:'Andar 10 - Bloco A',cap:30, tags:['Projetor 4K','Webcam','Sistema de som','Wi-Fi'],img:'../assets/sala-atlas.jpg' },
      { id:6, name:'Sala Zeus',   status:'green',  floor:'Andar 4 - Bloco B', cap:8,  tags:['TV 4K','Microfone','Wi-Fi'],                img:'../assets/sala-zeus.jpg'  }
    ];

    this._set('salas', defaults);
    return defaults;
  },

  setSalas(v)    { this._set('salas', v); },

  addSala(sala)  {
    const list = this.getSalas();
    sala.id = Date.now();
    list.push(sala);
    this.setSalas(list);
    return sala;
  },

  updateSala(id, patch) {
    const list = this.getSalas().map(s => Number(s.id) === Number(id) ? { ...s, ...patch } : s);
    this.setSalas(list);
  },

  deleteSala(id) {
    this.setSalas(this.getSalas().filter(s => Number(s.id) !== Number(id)));
  },

  async syncSalasFromBackend(force = false) {
    if (this._salasBackendSincronizadas && !force) {
      return this.getSalas();
    }

    const response = await apiFetch("/salas");

    if (!response || !response.ok) {
      throw new Error("Erro ao buscar salas do backend.");
    }

    const salasBackend = await response.json();

    const salasMapeadas = salasBackend.map(sala => {
      const localizacao = [
        sala.local,
        sala.bloco ? `Bloco ${sala.bloco}` : null,
        sala.andar ? `Andar ${sala.andar}` : null,
        sala.cidade && sala.estado ? `${sala.cidade}/${sala.estado}` : sala.cidade
      ].filter(Boolean).join(" · ");

      return {
        id: sala.id,
        name: sala.nome,
        status: "green",
        floor: localizacao || "Local não informado",
        cap: sala.capacidade || 0,
        tags: [
          sala.local,
          sala.cidade,
          sala.estado
        ].filter(Boolean),
        img: null,
        backend: true
      };
    });

    this.setSalas(salasMapeadas);
    this._salasBackendSincronizadas = true;

    return salasMapeadas;
  },

  /* ── RESERVAS ──────────────────────────────────────────────────── */
  getReservas() {
    const saved = this._get('reservas');
    if (saved) return saved;

    const defaults = [
      { id:1, title:'Planejamento Q2',        room:'Sala Olimpo', date:'2026-05-31', start:'09:00', end:'10:30', people:3, recurring:false },
      { id:2, title:'Daily Standup - Mobile', room:'Sala Aurora', date:'2026-05-31', start:'10:00', end:'10:30', people:2, recurring:true  },
      { id:3, title:'Apresentação Cliente',   room:'Sala Pégaso', date:'2026-05-31', start:'14:00', end:'16:00', people:2, recurring:false },
      { id:4, title:'1:1 com Tech Lead',      room:'Sala Hermes', date:'2026-05-31', start:'16:30', end:'17:00', people:2, recurring:false }
    ];

    this._set('reservas', defaults);
    return defaults;
  },

  setReservas(v)      { this._set('reservas', v); },

  addReserva(r) {
    const list = this.getReservas();
    r.id = Date.now();
    list.push(r);
    this.setReservas(list);
    return r;
  },

  deleteReserva(id) {
    this.setReservas(this.getReservas().filter(r => Number(r.id) !== Number(id)));
  },

  /* ── USUÁRIOS ──────────────────────────────────────────────────── */
  getUsuarios() {
    const saved = this._get('usuarios');
    if (saved) return saved;

    const defaults = [
      { id:1, name:'Ana Silva',     email:'ana@empresa.com',     team:'Engineering', role:'lead',  status:'Ativo'   },
      { id:2, name:'Carlos Mendes', email:'carlos@empresa.com',  team:'Mobile',      role:'user',  status:'Ativo'   },
      { id:3, name:'Júlia Ramos',   email:'julia@empresa.com',   team:'Vendas',      role:'user',  status:'Ativo'   },
      { id:4, name:'Pedro Souza',   email:'pedro@empresa.com',   team:'TI',          role:'admin', status:'Ativo'   },
      { id:5, name:'Beatriz Costa', email:'beatriz@empresa.com', team:'Design',      role:'user',  status:'Inativo' }
    ];

    this._set('usuarios', defaults);
    return defaults;
  },

  setUsuarios(v)   { this._set('usuarios', v); },

  addUsuario(u) {
    const list = this.getUsuarios();
    u.id = Date.now();
    list.push(u);
    this.setUsuarios(list);
    return u;
  },

  deleteUsuario(id) {
    this.setUsuarios(this.getUsuarios().filter(u => Number(u.id) !== Number(id)));
  },

  /* ── PERFIL DO USUÁRIO ─────────────────────────────────────────── */
  getPerfil() {
    const session = (() => {
      try { return JSON.parse(localStorage.getItem('rf_session')); }
      catch { return null; }
    })();

    const saved = this._get('perfil_' + (session?.email || 'guest'));

    return saved || {
      name: session?.name || 'Usuário',
      email: session?.email || '',
      avatar: null
    };
  },

  savePerfil(patch) {
    const session = (() => {
      try { return JSON.parse(localStorage.getItem('rf_session')); }
      catch { return null; }
    })();

    const key = 'perfil_' + (session?.email || 'guest');
    const current = this._get(key) || {};
    const updated = { ...current, ...patch };

    this._set(key, updated);

    if (session) {
      if (patch.name) session.name = patch.name;
      if (patch.email) session.email = patch.email;

      localStorage.setItem('rf_session', JSON.stringify(session));
    }

    return updated;
  },

  /* ── IMAGENS DE SALAS ──────────────────────────────────────────── */
  getSalaImg(id)       { return this._get('sala_img_' + id); },
  setSalaImg(id, data) { this._set('sala_img_' + id, data); },
  deleteSalaImg(id)    { localStorage.removeItem('rf_sala_img_' + id); }
};

/* ── ASSENTOS POR SALA ───────────────────────────────────────────── */
Object.assign(RF, {

  getAssentos() {
    const saved = this._get('assentos_v2');

    if (Array.isArray(saved)) {
      return saved;
    }

    this._set('assentos_v2', []);
    return [];
  },

  setAssentos(v) {
    this._set('assentos_v2', v);
  },

  updateAssento(id, state) {
    const list = this.getAssentos().map(a => {
      return String(a.id) === String(id) ? { ...a, state } : a;
    });

    this.setAssentos(list);
  },

  initSalaAssentos(salaId, salaName, cap) {
    console.warn("initSalaAssentos ignorado. Assentos agora vêm do backend.");
  },

  deleteSalaAssentos(salaId) {
    this.setAssentos(
      this.getAssentos().filter(a => Number(a.salaId) !== Number(salaId))
    );
  },

  async syncAssentosSalaFromBackend(salaId, filtros = {}) {
    const dataReserva = filtros.dataReserva || getHojeISO();
    const horarioInicio = filtros.horarioInicio || "10:00:00";
    const horarioFim = filtros.horarioFim || "12:00:00";

    console.log(`🔎 Buscando assentos da sala ${salaId}...`);

    const responseAssentos = await apiFetch(`/salas/${salaId}/assentos`);

    console.log(`📡 Status assentos sala ${salaId}:`, responseAssentos?.status);

    if (!responseAssentos || !responseAssentos.ok) {
      const erro = responseAssentos ? await responseAssentos.text() : "Sem resposta";
      console.error(`❌ Erro ao buscar assentos da sala ${salaId}:`, erro);

      const outrosAssentos = this.getAssentos()
        .filter(a => Number(a.salaId) !== Number(salaId));

      this.setAssentos(outrosAssentos);

      return [];
    }

    const assentosBackend = await responseAssentos.json();

    console.log(`✅ Resposta assentos sala ${salaId}:`, assentosBackend);

    let posicoesOcupadas = [];

    try {
      const params = new URLSearchParams({
        salaId,
        dataReserva,
        horarioInicio,
        horarioFim
      });

      const responseOcupados = await apiFetch(`/salas/ocupados?${params.toString()}`);

      console.log(`📡 Status ocupados sala ${salaId}:`, responseOcupados?.status);

      if (responseOcupados && responseOcupados.ok) {
        const ocupadosResponse = await responseOcupados.json();

        console.log(`🔴 Ocupados sala ${salaId}:`, ocupadosResponse);

        posicoesOcupadas = Array.isArray(ocupadosResponse)
          ? ocupadosResponse.map(Number)
          : [];
      }
    } catch (error) {
      console.warn("Não foi possível buscar assentos ocupados:", error);
    }

    const listaAssentos = Array.isArray(assentosBackend)
      ? assentosBackend
      : assentosBackend.assentos || assentosBackend.content || [];

    console.log(`🪑 Quantidade de assentos sala ${salaId}:`, listaAssentos.length);

    const assentosMapeados = listaAssentos
      .filter(a => a && a.ativo !== false)
      .map(a => {
        const posicao = Number(a.posicao);
        const ocupado = posicoesOcupadas.includes(posicao);
        const equipamentos = normalizarEquipamentosAssento(a);

        return {
          id: `${salaId}-${posicao}`,
          backendId: a.id,
          salaId: Number(salaId),
          posicao,
          label: String(posicao).padStart(2, "0"),
          state: ocupado ? "busy" : "free",

          tipoAssento: a.tipoAssento || a.tipo_assento || "ESTACAO_PADRAO",
          coordenadaX: a.coordenadaX ?? a.coordenada_x ?? null,
          coordenadaY: a.coordenadaY ?? a.coordenada_y ?? null,
          tipoCadeira: a.tipoCadeira || a.tipo_cadeira || null,
          tipoMesa: a.tipoMesa || a.tipo_mesa || null,
          ativo: a.ativo !== false,

          equipamentos
        };
      });

    const outrosAssentos = this.getAssentos()
      .filter(a => Number(a.salaId) !== Number(salaId));

    this.setAssentos([
      ...outrosAssentos,
      ...assentosMapeados
    ]);

    return assentosMapeados;
  },

  async syncAssentosTodasSalasFromBackend(filtros = {}) {
    const salas = this.getSalas();

    console.log("🏢 Salas carregadas para buscar assentos:", salas);

    this.setAssentos([]);

    const resultados = [];

    for (const sala of salas) {
      try {
        const assentos = await this.syncAssentosSalaFromBackend(sala.id, filtros);
        resultados.push(...assentos);
      } catch (error) {
        console.error(`Falha ao carregar assentos da sala ${sala.id} - ${sala.name}:`, error);
      }
    }

    console.log("✅ Total final de assentos carregados:", this.getAssentos().length);

    return this.getAssentos();
  }

});


/* ── Helpers globais ─────────────────────────────────────────────── */
function getHojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function normalizarEquipamentosAssento(assento) {
  const equipamentos =
    assento.equipamentos ||
    assento.equipamentosAssento ||
    assento.equipamentos_assento ||
    assento.equipamentosDisponiveis ||
    [];

  if (!Array.isArray(equipamentos)) {
    return [];
  }

  return equipamentos.map(eq => {
    if (typeof eq === "string") {
      return eq;
    }

    if (eq?.name) {
      return eq.name;
    }

    if (eq?.equipamento) {
      return eq.equipamento;
    }

    if (eq?.tipo) {
      return eq.tipo;
    }

    return String(eq);
  });
}
