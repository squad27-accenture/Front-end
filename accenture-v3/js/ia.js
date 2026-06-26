/* ══ ia.js — IA com grupos reais + confirmação visual ═════════════ */

(function () {
  let grupos = [];
  let ultimaRespostaIA = null;

  /* ═════════════════════════════════════════════════════
     HELPERS
     ═════════════════════════════════════════════════════ */

  function toast(title, msg, type = "info") {
    if (typeof showToast === "function") {
      showToast(title, msg, type);
    } else {
      console.log(`[${type}] ${title}: ${msg}`);
    }
  }

  function hojeISO() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  }

  function normalizarHora(hora) {
    if (!hora) return "00:00:00";
    return hora.length === 5 ? `${hora}:00` : hora;
  }

  function esc(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function numeroValido(valor) {
    if (valor === null || valor === undefined || valor === "") return null;

    if (typeof valor === "number") {
      return Number.isFinite(valor) && valor > 0 ? valor : null;
    }

    const texto = String(valor);
    const match = texto.match(/\d+/);
    const numero = match ? Number(match[0]) : Number(texto);

    return Number.isFinite(numero) && numero > 0 ? numero : null;
  }

  function extrairMensagemErro(texto) {
    try {
      const json = JSON.parse(texto);
      return json.erro || json.message || json.mensagem || json.error || texto;
    } catch {
      return texto;
    }
  }

  function getGrupoSelecionado() {
    const grupoId = Number(document.getElementById("ia-grupo-select")?.value || 0);

    if (!grupoId) return null;

    return grupos.find(g => Number(g.id) === grupoId) || null;
  }

  function getQuantidadeIntegrantesGrupo() {
    const grupo = getGrupoSelecionado();

    if (!grupo) return 1;

    const qtd = Array.isArray(grupo.usuarios)
      ? grupo.usuarios.length
      : 0;

    return qtd > 0 ? qtd : 1;
  }

  /* ═════════════════════════════════════════════════════
     CARREGAMENTO DE GRUPOS
     ═════════════════════════════════════════════════════ */

  async function carregarGruposIA() {
    const select = document.getElementById("ia-grupo-select");

    if (select) {
      select.innerHTML = `<option value="">Carregando grupos...</option>`;
    }

    const response = await apiFetch("/grupos");

    if (!response || !response.ok) {
      const texto = response ? await response.text() : "";
      throw new Error(texto || "Erro ao carregar grupos.");
    }

    grupos = await response.json();

    if (!select) return;

    if (!grupos.length) {
      select.innerHTML = `<option value="">Nenhum grupo disponível</option>`;
      return;
    }

    select.innerHTML = `
      <option value="">Selecione um grupo</option>

      ${grupos.map(g => `
        <option value="${g.id}">
          ${esc(g.nome)} — ${(g.usuarios || []).length} integrante(s)
        </option>
      `).join("")}
    `;
  }

  function montarPayloadIA() {
    const grupo = getGrupoSelecionado();

    if (!grupo) {
      throw new Error("Selecione um grupo.");
    }

    const data = document.getElementById("ia-data")?.value || hojeISO();
    const inicio = document.getElementById("ia-inicio")?.value || "10:00";
    const fim = document.getElementById("ia-fim")?.value || "12:00";

    const criterioProximidade =
      document.getElementById("ia-criterio-proximidade")?.value || "PREFERENCIAL";

    return {
      dataReserva: data,
      horarioInicio: normalizarHora(inicio),
      horarioFim: normalizarHora(fim),
      grupoId: Number(grupo.id),
      usuarioIds: null,
      criterioProximidade,
      proximidade: criterioProximidade !== "NENHUM"
    };
  }

  function renderPreviewPedido() {
    const preview = document.getElementById("ia-pedido-preview");

    if (!preview) return;

    const grupo = getGrupoSelecionado();

    if (!grupo) {
      preview.innerHTML = "";
      return;
    }

    const membros = grupo.usuarios || [];

    preview.innerHTML = `
      <strong>Grupo selecionado:</strong> ${esc(grupo.nome)}
      <br>
      <strong>Integrantes:</strong> ${membros.length}
      ${
        grupo.lider
          ? `<br><strong>Líder:</strong> ${esc(grupo.lider.nome || grupo.lider.email)}`
          : ""
      }
    `;
  }

  /* ═════════════════════════════════════════════════════
     ANÁLISE IA
     ═════════════════════════════════════════════════════ */

  async function analisarComIA() {
    const btn = document.getElementById("btn-ia-analisar-grupo");
    const results = document.getElementById("ia-results");

    try {
      const payload = montarPayloadIA();

      if (results) {
        results.innerHTML = `
          <div class="ia-empty">
            <div class="ia-empty-icon">
              <svg viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
                <path d="M9 9h6v6H9z"/>
              </svg>
            </div>

            <strong>Analisando opções...</strong>
            <p>A IA está procurando salas e assentos compatíveis.</p>
          </div>
        `;
      }

      if (btn) {
        btn.disabled = true;
        btn.textContent = "Analisando...";
      }

      const response = await apiFetch("/ia/opcoes", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const text = response ? await response.text() : "";
      let data = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!response || !response.ok) {
        throw new Error(data?.erro || data?.mensagem || text || "Erro ao comunicar com a IA.");
      }

      ultimaRespostaIA = data;

      renderResultadoIA(data);

    } catch (error) {
      console.error(error);

      if (results) {
        results.innerHTML = `
          <div class="ia-empty">
            <div class="ia-empty-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 9v4"/>
                <path d="M12 17h.01"/>
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              </svg>
            </div>

            <strong>Erro na análise</strong>
            <p>${esc(error.message || "Não foi possível analisar.")}</p>
          </div>
        `;
      }

      toast("Erro na IA", error.message || "Não foi possível analisar.", "error");

    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg viewBox="0 0 24 24">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          Analisar opções com IA
        `;
      }
    }
  }

  /* ═════════════════════════════════════════════════════
     NORMALIZAÇÃO DA RESPOSTA IA
     ═════════════════════════════════════════════════════ */

  function extrairOpcoesIA(data) {
    if (Array.isArray(data)) return data;

    return (
      data?.opcoes ||
      data?.opcoesRecomendadas ||
      data?.recomendacoes ||
      data?.resultado ||
      data?.resultados ||
      data?.data?.opcoes ||
      []
    );
  }

  function getCompatibilidade(opcao) {
    return (
      opcao?.compatibilidade ??
      opcao?.compatibilidadePercentual ??
      opcao?.percentualCompatibilidade ??
      opcao?.score ??
      opcao?.pontuacao ??
      0
    );
  }

  function getSalaId(opcao) {
    return numeroValido(
      opcao?.salaId ||
      opcao?.idSala ||
      opcao?.sala_id ||
      opcao?.sala?.id ||
      opcao?.salaDTO?.id
    );
  }

  function getSalaNome(opcao) {
    return (
      opcao?.salaNome ??
      opcao?.nomeSala ??
      opcao?.sala?.nome ??
      `Sala ${getSalaId(opcao) || ""}`
    );
  }

  function formatarNomeEnumIA(valor) {
    if (!valor) return "";

    const nomes = {
      COMPUTADOR_PC: "PC",
      COMPUTADOR_NOTEBOOK: "Notebook",
      NOTEBOOK: "Notebook",
      MONITOR: "Monitor",
      MONITOR_4K: "Monitor 4K",
      TV_4K: "TV 4K",
      WEBCAM: "Webcam",
      HEADSET: "Headset",
      MICROFONE: "Microfone",
      TECLADO: "Teclado",
      MOUSE: "Mouse",
      DOCKING_STATION: "Dock",
      TOMADA_ELETRICA: "Tomada",
      PONTO_DE_REDE: "Rede",
      PROJETOR: "Projetor",
      QUADRO_BRANCO: "Quadro branco",

      ESTACAO_PADRAO: "Estação padrão",
      ESTACAO_EXECUTIVA: "Estação executiva",
      SALA_REUNIAO_INDIVIDUAL: "Reunião individual",
      POSICAO_ACESSIVEL: "Acessível",
      HOT_DESK: "Hot desk",

      PROGRAMADOR: "Programador",
      DESIGNER: "Designer",
      DESIGN: "Designer",
      QA: "QA",
      SUPORTE: "Suporte",
      GESTOR: "Gestor",
      OUTRO: "Outro"
    };

    return nomes[valor] || String(valor).replaceAll("_", " ").toLowerCase();
  }

  function normalizarEquipamentoIA(eq) {
    if (!eq) return "";

    if (typeof eq === "string") {
      return formatarNomeEnumIA(eq);
    }

    return formatarNomeEnumIA(
      eq.nome ||
      eq.name ||
      eq.tipo ||
      eq.equipamento ||
      eq.descricao ||
      ""
    );
  }

  function normalizarAssentoIA(a) {
    if (typeof a === "number") {
      return {
        id: null,
        label: a,
        posicao: a,
        tipo: "ESTACAO_PADRAO",
        equipamentos: [],
        usuarioNome: "",
        usuarioEmail: ""
      };
    }

    const usuario =
      a?.usuario ||
      a?.user ||
      a?.funcionario ||
      null;

    const equipamentos =
      a?.equipamentos ||
      a?.recursos ||
      a?.equipamentosAtendidos ||
      a?.equipamentosObrigatorios ||
      a?.tags ||
      [];

    return {
      id:
        a?.id ||
        a?.assentoId ||
        a?.idAssento ||
        a?.codigo ||
        null,

      label:
        a?.label ||
        a?.numero ||
        a?.posicao ||
        a?.posicaoAssento ||
        a?.nome ||
        a?.codigo ||
        "—",

      posicao:
        a?.posicao ||
        a?.posicaoAssento ||
        a?.numero ||
        null,

      tipo:
        a?.tipoAssento ||
        a?.tipo ||
        a?.tipoPosicao ||
        a?.tipoFuncionario ||
        a?.categoria ||
        "ESTACAO_PADRAO",

      equipamentos: Array.isArray(equipamentos)
        ? equipamentos.map(normalizarEquipamentoIA).filter(Boolean)
        : [normalizarEquipamentoIA(equipamentos)].filter(Boolean),

      usuarioNome:
        a?.usuarioNome ||
        a?.nomeUsuario ||
        a?.funcionarioNome ||
        usuario?.nome ||
        usuario?.username ||
        usuario?.name ||
        "",

      usuarioEmail:
        a?.usuarioEmail ||
        a?.emailUsuario ||
        usuario?.email ||
        ""
    };
  }

  function getListaAssentosRaw(opcao) {
    const lista =
      opcao?.assentos ||
      opcao?.assentosSelecionados ||
      opcao?.assentosRecomendados ||
      opcao?.assentosSugeridos ||
      opcao?.listaAssentos ||
      opcao?.lugares ||
      opcao?.alocacoes ||
      opcao?.posicoesAssentos ||
      opcao?.posicoes ||
      [];

    return Array.isArray(lista) ? lista : [];
  }

  function getAssentosOpcao(opcao) {
    return getListaAssentosRaw(opcao).map(normalizarAssentoIA);
  }

  function extrairPosicoesAssentos(opcao) {
    const lista = getListaAssentosRaw(opcao);

    const posicoes = lista
      .map(item => {
        if (typeof item === "number") return item;

        return numeroValido(
          item?.posicao ||
          item?.posicaoAssento ||
          item?.numero ||
          item?.numeroAssento ||
          item?.label ||
          item?.id
        );
      })
      .filter(Boolean);

    if (posicoes.length) {
      return [...new Set(posicoes)];
    }

    /*
      Fallback para demo:
      se a IA retornou sala mas não retornou assentos, cria posições 1..quantidade de integrantes.
      O backend ainda valida se esses assentos existem e estão livres.
    */
    const qtd = getQuantidadeIntegrantesGrupo();

    return Array.from({ length: qtd }, (_, i) => i + 1);
  }

  /* ═════════════════════════════════════════════════════
     RENDER RESULTADOS IA
     ═════════════════════════════════════════════════════ */

  function renderResultadoIA(data) {
    const results = document.getElementById("ia-results");

    if (!results) return;

    const opcoes = extrairOpcoesIA(data);

    window.ultimasOpcoesIa = opcoes;

    if (!opcoes.length) {
      results.innerHTML = `
        <div class="ia-empty">
          <div class="ia-empty-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 9v4"/>
              <path d="M12 17h.01"/>
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            </svg>
          </div>

          <strong>Nenhuma opção encontrada</strong>
          <p>${esc(data?.mensagem || data?.message || "A IA não encontrou salas compatíveis para esse horário.")}</p>
        </div>
      `;
      return;
    }

    results.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:14px">
        ${data?.mensagem ? `
          <div style="
            padding:12px;
            border:1px solid var(--border);
            background:var(--surface-2);
            border-radius:var(--r-md);
            color:var(--text-muted);
            font-size:.86rem;
          ">
            ${esc(data.mensagem)}
          </div>
        ` : ""}

        ${opcoes.map((opcao, index) => renderOpcaoIA(opcao, index)).join("")}
      </div>
    `;

    results.querySelectorAll("[data-confirmar-opcao-ia]").forEach(btn => {
      btn.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        const index = Number(btn.dataset.confirmarOpcaoIa);
        abrirConfirmacaoReservaIA(index);
      });
    });
  }

  function renderOpcaoIA(opcao, index) {
    const compatibilidade = Number(getCompatibilidade(opcao));
    const assentos = getAssentosOpcao(opcao);
    const salaNome = getSalaNome(opcao);
    const posicoes = extrairPosicoesAssentos(opcao);

    return `
      <div class="grupo-card" style="border-color:${compatibilidade >= 80 ? "var(--success)" : "var(--border)"}">
        <div class="grupo-card-header">
          <div>
            <h3>${esc(salaNome)}</h3>
            <p>${esc(opcao?.observacao || opcao?.motivo || opcao?.descricao || "Opção sugerida pela IA")}</p>
          </div>

          <span class="badge ${compatibilidade >= 80 ? "badge--green" : "badge--blue"}">
            ${compatibilidade || 0}% compatível
          </span>
        </div>

        <div style="
          margin:8px 0 4px;
          font-size:.82rem;
          font-weight:700;
          color:var(--text);
        ">
          Assentos recomendados
        </div>

        <div class="grupo-membros">
          ${
            assentos.length
              ? assentos.map(a => `
                <div class="grupo-membro">
                  <div class="grupo-membro-avatar">
                    ${esc(a.label)}
                  </div>

                  <div class="grupo-membro-info">
                    <strong>
                      Assento ${esc(a.label)}
                      ${a.posicao ? `<span style="color:var(--text-muted);font-weight:500">• posição ${esc(a.posicao)}</span>` : ""}
                    </strong>

                    <small>
                      ${esc(formatarNomeEnumIA(a.tipo))}
                      ${
                        a.equipamentos.length
                          ? ` • ${esc(a.equipamentos.slice(0, 4).join(" · "))}`
                          : " • Sem equipamentos informados"
                      }
                    </small>

                    ${
                      a.usuarioNome || a.usuarioEmail
                        ? `
                          <small style="display:block;margin-top:2px">
                            Indicado para: ${esc(a.usuarioNome || a.usuarioEmail)}
                          </small>
                        `
                        : ""
                    }
                  </div>
                </div>
              `).join("")
              : `
                <div class="grupo-membro">
                  <div class="grupo-membro-avatar">IA</div>

                  <div class="grupo-membro-info">
                    <strong>Assentos gerados automaticamente</strong>
                    <small>
                      A IA não retornou assentos detalhados. Para demo, serão usados:
                      ${posicoes.map(p => `Assento ${p}`).join(", ")}.
                    </small>
                  </div>
                </div>
              `
          }
        </div>

        ${
          opcao?.equipamentosSala?.length || opcao?.recursosSala?.length
            ? `
              <div style="
                margin-top:12px;
                padding:10px;
                border-radius:var(--r-md);
                background:var(--surface-2);
                border:1px solid var(--border);
                color:var(--text-muted);
                font-size:.8rem;
              ">
                <strong style="color:var(--text)">Equipamentos da sala:</strong>
                ${esc((opcao.equipamentosSala || opcao.recursosSala || []).map(normalizarEquipamentoIA).join(" · "))}
              </div>
            `
            : ""
        }

        <div class="grupo-actions">
          <button type="button" class="btn-primary" data-confirmar-opcao-ia="${index}">
            Usar esta opção
          </button>
        </div>
      </div>
    `;
  }

  /* ═════════════════════════════════════════════════════
     MODAL CONFIRMAÇÃO IA
     ═════════════════════════════════════════════════════ */

  function garantirModalConfirmacaoIA() {
    let modal = document.getElementById("ia-confirmacao-modal");

    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "ia-confirmacao-modal";
    modal.className = "modal-overlay";
    modal.style.display = "none";

    modal.innerHTML = `
      <div class="modal" style="max-width:520px">
        <div class="modal-header">
          <h3 id="ia-confirmacao-title">Confirmar reserva</h3>

          <button class="modal-close" type="button" id="ia-confirmacao-close">
            <svg viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="modal-body" id="ia-confirmacao-body"></div>

        <div class="modal-footer" id="ia-confirmacao-footer"></div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#ia-confirmacao-close")?.addEventListener("click", fecharModalConfirmacaoIA);

    modal.addEventListener("click", event => {
      if (event.target === modal) {
        fecharModalConfirmacaoIA();
      }
    });

    return modal;
  }

  function abrirModalConfirmacaoIA() {
    const modal = garantirModalConfirmacaoIA();
    modal.classList.add("open");
    modal.style.display = "flex";
  }

  function fecharModalConfirmacaoIA() {
    const modal = document.getElementById("ia-confirmacao-modal");

    if (!modal) return;

    modal.classList.remove("open");
    modal.style.display = "none";
  }

  function getOpcaoPorIndex(index) {
    const opcoes = Array.isArray(window.ultimasOpcoesIa)
      ? window.ultimasOpcoesIa
      : extrairOpcoesIA(ultimaRespostaIA);

    return opcoes[index] || null;
  }

  function abrirConfirmacaoReservaIA(index) {
    const opcao = getOpcaoPorIndex(index);

    if (!opcao) {
      toast("Erro", "Opção da IA não encontrada.", "error");
      return;
    }

    const modal = garantirModalConfirmacaoIA();
    const title = modal.querySelector("#ia-confirmacao-title");
    const body = modal.querySelector("#ia-confirmacao-body");
    const footer = modal.querySelector("#ia-confirmacao-footer");

    const grupoSelect = document.getElementById("ia-grupo-select");
    const grupoNome = grupoSelect?.selectedOptions?.[0]?.textContent || "Grupo selecionado";

    const dataReserva = document.getElementById("ia-data")?.value || "—";
    const horarioInicio = normalizarHora(document.getElementById("ia-inicio")?.value || "10:00");
    const horarioFim = normalizarHora(document.getElementById("ia-fim")?.value || "12:00");

    const salaNome = getSalaNome(opcao);
    const posicoes = extrairPosicoesAssentos(opcao);

    title.textContent = "Confirmar reserva da IA";

    body.innerHTML = `
      <div style="
        border:1px solid var(--border);
        background:var(--surface-2);
        border-radius:var(--r-md);
        padding:16px;
        display:flex;
        flex-direction:column;
        gap:12px;
      ">
        <div>
          <strong style="display:block;color:var(--text);font-size:1rem">
            ${esc(salaNome)}
          </strong>
          <small style="color:var(--text-muted)">
            Opção recomendada pela IA
          </small>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <small style="color:var(--text-muted)">Grupo</small>
            <strong style="display:block;color:var(--text)">
              ${esc(grupoNome)}
            </strong>
          </div>

          <div>
            <small style="color:var(--text-muted)">Data</small>
            <strong style="display:block;color:var(--text)">
              ${esc(dataReserva)}
            </strong>
          </div>

          <div>
            <small style="color:var(--text-muted)">Início</small>
            <strong style="display:block;color:var(--text)">
              ${esc(horarioInicio)}
            </strong>
          </div>

          <div>
            <small style="color:var(--text-muted)">Fim</small>
            <strong style="display:block;color:var(--text)">
              ${esc(horarioFim)}
            </strong>
          </div>
        </div>

        <div>
          <small style="color:var(--text-muted)">Assentos que serão reservados</small>

          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
            ${
              posicoes.length
                ? posicoes.map(p => `
                  <span class="badge badge--blue">
                    Assento ${esc(p)}
                  </span>
                `).join("")
                : `<span style="color:var(--error)">Nenhum assento válido encontrado</span>`
            }
          </div>
        </div>

        <div style="
          padding:10px;
          border-radius:var(--r-md);
          background:var(--accent-faint);
          color:var(--text-muted);
          font-size:.82rem;
        ">
          Confira os dados antes de confirmar. Após confirmar, a reserva será criada para o grupo.
        </div>
      </div>
    `;

    footer.innerHTML = `
      <button type="button" class="btn-ghost" id="ia-confirmacao-cancelar">
        Cancelar
      </button>

      <button type="button" class="btn-primary" id="ia-confirmacao-confirmar">
        Confirmar reserva
      </button>
    `;

    footer.querySelector("#ia-confirmacao-cancelar")?.addEventListener("click", fecharModalConfirmacaoIA);

    footer.querySelector("#ia-confirmacao-confirmar")?.addEventListener("click", () => {
      confirmarReservaIA(index);
    });

    abrirModalConfirmacaoIA();
  }

  function renderModalSucessoIA(qtdAssentos) {
    const modal = garantirModalConfirmacaoIA();
    const title = modal.querySelector("#ia-confirmacao-title");
    const body = modal.querySelector("#ia-confirmacao-body");
    const footer = modal.querySelector("#ia-confirmacao-footer");

    title.textContent = "Reserva confirmada";

    body.innerHTML = `
      <div style="
        text-align:center;
        border:1px solid var(--success);
        background:var(--accent-faint);
        border-radius:var(--r-md);
        padding:22px;
      ">
        <div style="
          width:58px;
          height:58px;
          border-radius:999px;
          display:grid;
          place-items:center;
          background:var(--success);
          color:white;
          font-size:1.8rem;
          font-weight:900;
          margin:0 auto 14px;
        ">
          ✓
        </div>

        <strong style="display:block;color:var(--text);font-size:1.05rem">
          Reserva criada com sucesso
        </strong>

        <p style="color:var(--text-muted);margin-top:8px;font-size:.9rem">
          ${qtdAssentos} assento(s) foram reservados para o grupo.
        </p>
      </div>
    `;

    footer.innerHTML = `
      <button type="button" class="btn-ghost" id="ia-sucesso-fechar">
        Fechar
      </button>

      <button type="button" class="btn-primary" id="ia-sucesso-ver-reservas">
        Ver reservas
      </button>
    `;

    footer.querySelector("#ia-sucesso-fechar")?.addEventListener("click", fecharModalConfirmacaoIA);

    footer.querySelector("#ia-sucesso-ver-reservas")?.addEventListener("click", () => {
      fecharModalConfirmacaoIA();
      document.querySelector('.nav-item[data-section="reservas"]')?.click();
    });

    abrirModalConfirmacaoIA();
  }

  /* ═════════════════════════════════════════════════════
     CONFIRMAR RESERVA BACKEND
     ═════════════════════════════════════════════════════ */

  async function confirmarReservaIA(index) {
    const opcao = getOpcaoPorIndex(index);

    if (!opcao) {
      toast("Erro", "Opção da IA não encontrada.", "error");
      return;
    }

    const grupoId = numeroValido(document.getElementById("ia-grupo-select")?.value);
    const salaId = getSalaId(opcao);

    const dataReserva = document.getElementById("ia-data")?.value;
    const horarioInicio = normalizarHora(document.getElementById("ia-inicio")?.value || "10:00");
    const horarioFim = normalizarHora(document.getElementById("ia-fim")?.value || "12:00");

    const posicoesAssentos = extrairPosicoesAssentos(opcao);

    if (!grupoId) {
      toast("Grupo obrigatório", "Selecione um grupo.", "error");
      return;
    }

    if (!salaId) {
      toast("Erro na opção", "A opção não possui salaId.", "error");
      console.error("Opção sem salaId:", opcao);
      return;
    }

    if (!dataReserva || !horarioInicio || !horarioFim) {
      toast("Data e horário obrigatórios", "Informe data, início e fim.", "error");
      return;
    }

    if (!posicoesAssentos.length) {
      toast("Erro na opção", "A opção não possui assentos válidos.", "error");
      console.error("Opção sem assentos válidos:", opcao);
      return;
    }

    const payload = {
      grupoId,
      salaId,
      dataReserva,
      horarioInicio,
      horarioFim,
      posicoesAssentos
    };

    const btn = document.getElementById("ia-confirmacao-confirmar");

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Confirmando...";
      }

      console.log("ENVIANDO PARA /reservas/confirmar-opcao:", payload);

      const response = await apiFetch("/reservas/confirmar-opcao", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const texto = response ? await response.text() : "";

      console.log("RESPOSTA CONFIRMAR IA:", response?.status, texto);

      if (!response || !response.ok) {
        toast(
          "Erro ao confirmar",
          extrairMensagemErro(texto) || "Não foi possível confirmar a reserva.",
          "error"
        );

        return;
      }

      toast(
        "Reserva confirmada",
        `${posicoesAssentos.length} assento(s) reservado(s) com sucesso.`,
        "success"
      );

      renderModalSucessoIA(posicoesAssentos.length);

      if (typeof window.refreshReservas === "function") {
        window.refreshReservas();
      }

      if (typeof window.refreshCalendario === "function") {
        window.refreshCalendario();
      }

      if (typeof window.carregarDashboardReal === "function") {
        window.carregarDashboardReal();
      }

    } catch (error) {
      console.error("ERRO AO CONFIRMAR RESERVA IA:", error);
      toast("Erro", "Falha ao comunicar com o backend.", "error");

    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Confirmar reserva";
      }
    }
  }

  /* ═════════════════════════════════════════════════════
     INIT
     ═════════════════════════════════════════════════════ */

  window.initIA = async function () {
    const dataInput = document.getElementById("ia-data");

    if (dataInput && !dataInput.value) {
      dataInput.value = hojeISO();
    }

    if (!window.__iaEventosInstalados) {
      window.__iaEventosInstalados = true;

      document.getElementById("ia-grupo-select")?.addEventListener("change", renderPreviewPedido);
      document.getElementById("btn-ia-analisar-grupo")?.addEventListener("click", analisarComIA);
    }

    try {
      await carregarGruposIA();
      renderPreviewPedido();

    } catch (error) {
      console.error(error);

      const select = document.getElementById("ia-grupo-select");

      if (select) {
        select.innerHTML = `<option value="">Erro ao carregar grupos</option>`;
      }

      toast("Erro", "Não foi possível carregar os grupos.", "error");
    }
  };

  window.refreshIA = window.initIA;
})();