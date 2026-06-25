/* ══ ia.js — IA com grupos reais ═══════════════════════════════════ */

(function () {
  let grupos = [];
  let ultimaRespostaIA = null;

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

  function getGrupoSelecionado() {
    const grupoId = Number(document.getElementById("ia-grupo-select")?.value || 0);

    if (!grupoId) return null;

    return grupos.find(g => Number(g.id) === grupoId) || null;
  }

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

  function getCompatibilidade(opcao) {
    return (
      opcao.compatibilidade ??
      opcao.compatibilidadePercentual ??
      opcao.percentualCompatibilidade ??
      opcao.score ??
      opcao.pontuacao ??
      0
    );
  }


  function getSalaNome(opcao) {
    return (
      opcao.salaNome ??
      opcao.nomeSala ??
      opcao.sala?.nome ??
      `Sala ${opcao.salaId ?? ""}`
    );
  }

  function renderResultadoIA(data) {
    const results = document.getElementById("ia-results");

    if (!results) return;

    const opcoes = data?.opcoes || [];

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
          <p>${esc(data?.mensagem || "A IA não encontrou salas compatíveis para esse horário.")}</p>
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
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.confirmarOpcaoIa);
        prepararConfirmacaoOpcao(index);
      });
    });
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

function normalizarAssentoIA(a) {
  const usuario =
    a.usuario ||
    a.user ||
    a.funcionario ||
    null;

  const equipamentos =
    a.equipamentos ||
    a.recursos ||
    a.equipamentosAtendidos ||
    a.equipamentosObrigatorios ||
    a.tags ||
    [];

  return {
    id:
      a.id ||
      a.assentoId ||
      a.idAssento ||
      a.codigo ||
      null,

    label:
      a.label ||
      a.numero ||
      a.posicao ||
      a.posicaoAssento ||
      a.nome ||
      a.codigo ||
      "—",

    posicao:
      a.posicao ||
      a.posicaoAssento ||
      a.numero ||
      null,

    tipo:
      a.tipoAssento ||
      a.tipo ||
      a.tipoPosicao ||
      a.tipoFuncionario ||
      a.categoria ||
      "ESTACAO_PADRAO",

    equipamentos: Array.isArray(equipamentos)
      ? equipamentos.map(normalizarEquipamentoIA).filter(Boolean)
      : [normalizarEquipamentoIA(equipamentos)].filter(Boolean),

    usuarioNome:
      a.usuarioNome ||
      a.nomeUsuario ||
      a.funcionarioNome ||
      usuario?.nome ||
      usuario?.username ||
      usuario?.name ||
      "",

    usuarioEmail:
      a.usuarioEmail ||
      a.emailUsuario ||
      usuario?.email ||
      ""
  };
}

function getAssentosOpcao(opcao) {
  const lista =
    opcao.assentos ||
    opcao.assentosSelecionados ||
    opcao.assentosRecomendados ||
    opcao.assentosSugeridos ||
    opcao.lugares ||
    opcao.alocacoes ||
    opcao.posicoes ||
    [];

  if (!Array.isArray(lista)) {
    return [];
  }

  return lista.map(normalizarAssentoIA);
}

function renderOpcaoIA(opcao, index) {
  const compatibilidade = Number(getCompatibilidade(opcao));
  const assentos = getAssentosOpcao(opcao);
  const salaNome = getSalaNome(opcao);

  return `
    <div class="grupo-card" style="border-color:${compatibilidade >= 80 ? "var(--success)" : "var(--border)"}">
      <div class="grupo-card-header">
        <div>
          <h3>${esc(salaNome)}</h3>
          <p>${esc(opcao.observacao || opcao.motivo || opcao.descricao || "Opção sugerida pela IA")}</p>
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
                <div class="grupo-membro-avatar">?</div>

                <div class="grupo-membro-info">
                  <strong>Assentos não vieram na resposta</strong>
                  <small>
                    A IA retornou a sala, mas não retornou a lista de assentos/equipamentos.
                  </small>
                </div>
              </div>
            `
        }
      </div>

      ${
        opcao.equipamentosSala?.length || opcao.recursosSala?.length
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
        <button class="btn-primary" data-confirmar-opcao-ia="${index}">
          Usar esta opção
        </button>
      </div>
    </div>
  `;
}
  function prepararConfirmacaoOpcao(index) {
    const opcao = ultimaRespostaIA?.opcoes?.[index];

    if (!opcao) {
      toast("Opção inválida", "Não foi possível encontrar essa opção.", "error");
      return;
    }

    toast(
      "Opção selecionada",
      "Agora vamos ligar esse botão no endpoint de confirmação da reserva em grupo.",
      "info"
    );

    console.log("Opção selecionada para confirmar:", opcao);
    console.log("Resposta completa da IA:", ultimaRespostaIA);
  }

  window.initIA = async function () {
    const dataInput = document.getElementById("ia-data");

    if (dataInput && !dataInput.value) {
      dataInput.value = hojeISO();
    }

    document.getElementById("ia-grupo-select")?.addEventListener("change", renderPreviewPedido);
    document.getElementById("btn-ia-analisar-grupo")?.addEventListener("click", analisarComIA);

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
})();