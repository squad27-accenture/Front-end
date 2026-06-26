/* ══ reservas.js — reservas reais agrupando reserva em grupo ═══════ */

(function () {
  let reservasRaw = [];
  let inicializado = false;

  function toast(title, msg, type = "info") {
    if (typeof showToast === "function") {
      showToast(title, msg, type);
    } else {
      console.log(`[${type}] ${title}: ${msg}`);
    }
  }

  function esc(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function somenteData(valor) {
    if (!valor) return "";

    const texto = String(valor);

    if (texto.includes("T")) return texto.split("T")[0];

    return texto.slice(0, 10);
  }

  function formatarData(valor) {
    const data = somenteData(valor);

    if (!data || !data.includes("-")) return valor || "—";

    const [ano, mes, dia] = data.split("-");

    return `${dia}/${mes}/${ano}`;
  }

  function formatarHora(valor) {
    if (!valor) return "—";

    return String(valor).slice(0, 5);
  }

  function normalizarStatus(status) {
    return String(status || "CONFIRMADA").toUpperCase();
  }

  function getStatusLabel(status) {
    const s = normalizarStatus(status);

    if (s.includes("CANCEL")) return "Cancelada";
    if (s.includes("CONFIRM")) return "Confirmada";

    return s;
  }

  function getStatusClass(status) {
    const s = normalizarStatus(status);

    if (s.includes("CANCEL")) return "badge--red";

    return "badge--green";
  }

  function getReservaId(r) {
    return r.id || r.reservaId || r.codigo || null;
  }

  function getSalaId(r) {
    return r.salaId || r.idSala || r.sala?.id || null;
  }

  function getSalaNome(r) {
    return (
      r.salaNome ||
      r.nomeSala ||
      r.sala?.nome ||
      r.nomeDaSala ||
      `Sala ${getSalaId(r) || ""}`
    );
  }

  function getUsuarioNome(r) {
    return (
      r.usuarioNome ||
      r.nomeUsuario ||
      r.usuario?.nome ||
      r.usuario?.username ||
      r.usuario?.name ||
      r.usuarioEmail ||
      r.emailUsuario ||
      r.usuario?.email ||
      "Usuário"
    );
  }

  function getUsuarioEmail(r) {
    return (
      r.usuarioEmail ||
      r.emailUsuario ||
      r.usuario?.email ||
      ""
    );
  }

  function getPosicao(r) {
    return (
      r.posicao ||
      r.posicaoAssento ||
      r.numeroAssento ||
      r.assento?.posicao ||
      r.assento?.numero ||
      r.assentoId ||
      null
    );
  }

  function getCodigoGrupo(r) {
    return (
      r.codigoGrupo ||
      r.codigo_grupo ||
      r.grupoCodigo ||
      r.codigoReservaGrupo ||
      null
    );
  }

  function normalizarReserva(r) {
    return {
      raw: r,
      id: getReservaId(r),
      codigoGrupo: getCodigoGrupo(r),
      salaId: getSalaId(r),
      salaNome: getSalaNome(r),
      dataReserva: somenteData(r.dataReserva || r.data || r.dia),
      horarioInicio: r.horarioInicio || r.inicio || r.horaInicio,
      horarioFim: r.horarioFim || r.fim || r.horaFim,
      posicao: getPosicao(r),
      status: normalizarStatus(r.statusReserva || r.status || r.situacao),
      usuarioNome: getUsuarioNome(r),
      usuarioEmail: getUsuarioEmail(r)
    };
  }

  function aplicarFiltros(lista) {
    const inicio = document.getElementById("reservas-filter-inicio")?.value || "";
    const fim = document.getElementById("reservas-filter-fim")?.value || "";
    const status = document.getElementById("reservas-filter-status")?.value || "";

    return lista.filter(r => {
      const data = r.dataReserva;

      if (inicio && data < inicio) return false;
      if (fim && data > fim) return false;

      if (status) {
        const statusAtual = normalizarStatus(r.status);

        if (!statusAtual.includes(status)) return false;
      }

      return true;
    });
  }

  function agruparReservas(listaNormalizada) {
    const mapa = new Map();

    listaNormalizada.forEach(r => {
      const ehGrupo = !!r.codigoGrupo;

      const chave = ehGrupo
        ? `GRUPO-${r.codigoGrupo}-${r.salaId}-${r.dataReserva}-${r.horarioInicio}-${r.horarioFim}`
        : `INDIVIDUAL-${r.id || Math.random()}`;

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          tipo: ehGrupo ? "GRUPO" : "INDIVIDUAL",
          codigoGrupo: r.codigoGrupo,
          salaId: r.salaId,
          salaNome: r.salaNome,
          dataReserva: r.dataReserva,
          horarioInicio: r.horarioInicio,
          horarioFim: r.horarioFim,
          status: r.status,
          reservas: [],
          assentos: [],
          usuarios: []
        });
      }

      const grupo = mapa.get(chave);

      grupo.reservas.push(r);

      if (r.posicao && !grupo.assentos.includes(Number(r.posicao))) {
        grupo.assentos.push(Number(r.posicao));
      }

      const usuarioChave = r.usuarioEmail || r.usuarioNome;

      if (usuarioChave && !grupo.usuarios.some(u => u.chave === usuarioChave)) {
        grupo.usuarios.push({
          chave: usuarioChave,
          nome: r.usuarioNome,
          email: r.usuarioEmail
        });
      }

      if (normalizarStatus(r.status).includes("CONFIRM")) {
        grupo.status = "CONFIRMADA";
      }
    });

    return Array.from(mapa.values())
      .map(item => {
        item.assentos.sort((a, b) => a - b);

        if (!item.assentos.length && item.reservas.length) {
          item.assentos = item.reservas
            .map(r => Number(r.posicao))
            .filter(Boolean)
            .sort((a, b) => a - b);
        }

        return item;
      })
      .sort((a, b) => {
        const dataA = `${a.dataReserva || ""} ${a.horarioInicio || ""}`;
        const dataB = `${b.dataReserva || ""} ${b.horarioInicio || ""}`;

        return dataB.localeCompare(dataA);
      });
  }

  function renderReservas() {
    const container =
      document.getElementById("reservas-container") ||
      document.querySelector("[data-reservas-list]") ||
      document.getElementById("reservas-view-wrap");

    const count = document.getElementById("reservas-count");

    if (!container) {
      console.error("Container de reservas não encontrado.");
      return;
    }

    const normalizadas = reservasRaw.map(normalizarReserva);
    const filtradas = aplicarFiltros(normalizadas);
    const agrupadas = agruparReservas(filtradas);

    if (count) {
      count.textContent = `${agrupadas.length} reserva(s)`;
    }

    if (!agrupadas.length) {
      container.innerHTML = `
        <div class="grupo-empty">
          Nenhuma reserva encontrada.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="reservas-grid-list">
        ${agrupadas.map(renderReservaCard).join("")}
      </div>
    `;

    wireReservaActions(container);
  }

  function renderReservaCard(item) {
    const ehGrupo = item.tipo === "GRUPO";
    const statusClass = getStatusClass(item.status);
    const statusLabel = getStatusLabel(item.status);

    const assentosTexto = item.assentos.length
      ? item.assentos.map(p => `Assento ${p}`).join(", ")
      : "Assentos não informados";

    const usuariosTexto = item.usuarios.length
      ? item.usuarios.map(u => u.nome || u.email).join(", ")
      : "Usuários não informados";

    const tituloTipo = ehGrupo
      ? `Grupo ${item.codigoGrupo}`
      : "Individual";

    const quantidadeAssentos = item.assentos.length || item.reservas.length || 1;

    return `
      <div class="reserva-card reserva-card-compact ${ehGrupo ? "reserva-card-grupo" : ""}">
        <div class="reserva-card-main">
          <div class="reserva-avatar">
            ${ehGrupo ? "G" : "S"}
          </div>

          <div class="reserva-info">
            <div class="reserva-title-row">
              <h3>${esc(item.salaNome)}</h3>

              <span class="badge ${statusClass}">
                ${statusLabel}
              </span>
            </div>

            <div class="reserva-meta">
              <span>${esc(formatarData(item.dataReserva))}</span>
              <span>•</span>
              <span>${esc(formatarHora(item.horarioInicio))} - ${esc(formatarHora(item.horarioFim))}</span>
              <span>•</span>
              <span>
                ${
                  ehGrupo
                    ? `${quantidadeAssentos} assento(s)`
                    : `Assento ${esc(item.assentos[0] || item.reservas[0]?.posicao || "—")}`
                }
              </span>
              <span>•</span>
              <span>${esc(tituloTipo)}</span>
            </div>

            ${
              ehGrupo
                ? `
                  <div class="reserva-group-details">
                    <div class="reserva-assentos-line">
                      <strong>Assentos:</strong> ${esc(assentosTexto)}
                    </div>

                    <div class="reserva-users-line">
                      <strong>Integrantes:</strong> ${esc(usuariosTexto)}
                    </div>
                  </div>
                `
                : ""
            }
          </div>
        </div>

        <div class="reserva-card-actions">
          ${
            normalizarStatus(item.status).includes("CANCEL")
              ? ""
              : ehGrupo
                ? `
                  <button
                    type="button"
                    class="btn-danger btn-reserva-small"
                    data-cancelar-grupo="${esc(item.codigoGrupo)}"
                  >
                    Cancelar grupo
                  </button>
                `
                : `
                  <button
                    type="button"
                    class="btn-danger btn-reserva-small"
                    data-cancelar-reserva="${esc(item.reservas[0]?.id || "")}"
                  >
                    Cancelar
                  </button>
                `
          }
        </div>
      </div>
    `;
  }

  function wireReservaActions(container) {
    container.querySelectorAll("[data-cancelar-reserva]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.cancelarReserva;

        if (!id) return;

        if (!confirm("Deseja cancelar esta reserva?")) return;

        await cancelarReservaIndividual(id);
      });
    });

    container.querySelectorAll("[data-cancelar-grupo]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const codigoGrupo = btn.dataset.cancelarGrupo;

        if (!codigoGrupo) return;

        if (!confirm("Deseja cancelar todas as reservas deste grupo?")) return;

        await cancelarReservaGrupo(codigoGrupo);
      });
    });
  }

  async function cancelarReservaIndividual(id) {
    try {
      const response = await apiFetch(
        `/reservas/${id}/cancelar?motivo=${encodeURIComponent("Cancelado pelo usuário")}`,
        {
          method: "PUT"
        }
      );

      if (!response || !response.ok) {
        const texto = response ? await response.text() : "";
        toast("Erro ao cancelar", texto || "Não foi possível cancelar a reserva.", "error");
        return;
      }

      toast("Reserva cancelada", "A reserva foi cancelada com sucesso.", "success");

      await carregarReservas();

    } catch (error) {
      console.error(error);
      toast("Erro", "Falha ao cancelar reserva.", "error");
    }
  }

  async function cancelarReservaGrupo(codigoGrupo) {
    try {
      const response = await apiFetch(
        `/reservas/grupo/${encodeURIComponent(codigoGrupo)}/cancelar?motivo=${encodeURIComponent("Cancelado pelo usuário")}`,
        {
          method: "PUT"
        }
      );

      if (!response || !response.ok) {
        const texto = response ? await response.text() : "";
        toast("Erro ao cancelar grupo", texto || "Não foi possível cancelar o grupo.", "error");
        return;
      }

      toast("Reserva em grupo cancelada", "Todas as reservas do grupo foram canceladas.", "success");

      await carregarReservas();

    } catch (error) {
      console.error(error);
      toast("Erro", "Falha ao cancelar reserva em grupo.", "error");
    }
  }

  async function carregarReservas() {
    const container =
      document.getElementById("reservas-container") ||
      document.querySelector("[data-reservas-list]") ||
      document.getElementById("reservas-view-wrap");

    if (container) {
      container.innerHTML = `
        <div class="grupo-empty">
          Carregando reservas...
        </div>
      `;
    }

    try {
      const response = await apiFetch("/reservas/historico");

      if (!response || !response.ok) {
        const texto = response ? await response.text() : "";
        throw new Error(texto || "Não foi possível carregar reservas.");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        reservasRaw = data;
      } else if (Array.isArray(data.content)) {
        reservasRaw = data.content;
      } else if (Array.isArray(data.data)) {
        reservasRaw = data.data;
      } else {
        reservasRaw = [];
      }

      renderReservas();

    } catch (error) {
      console.error(error);

      if (container) {
        container.innerHTML = `
          <div class="grupo-empty">
            Erro ao carregar reservas.
          </div>
        `;
      }

      toast("Erro", error.message || "Não foi possível carregar reservas.", "error");
    }
  }

  function configurarFiltros() {
    const inicio = document.getElementById("reservas-filter-inicio");
    const fim = document.getElementById("reservas-filter-fim");
    const status = document.getElementById("reservas-filter-status");
    const clear = document.getElementById("reservas-filter-clear");

    inicio?.addEventListener("change", renderReservas);
    fim?.addEventListener("change", renderReservas);
    status?.addEventListener("change", renderReservas);

    clear?.addEventListener("click", () => {
      if (inicio) inicio.value = "";
      if (fim) fim.value = "";
      if (status) status.value = "";

      renderReservas();
    });
  }

  window.initReservas = async function () {
    if (!inicializado) {
      inicializado = true;
      configurarFiltros();
    }

    await carregarReservas();
  };

  window.refreshReservas = carregarReservas;
})();