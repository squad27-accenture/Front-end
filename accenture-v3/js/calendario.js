/* ══ calendario.js — calendário real com reservas do backend ═══════ */

(function () {
  let dataAtual = new Date();
  let reservas = [];

  function toast(title, msg, type = "info") {
    if (typeof showToast === "function") {
      showToast(title, msg, type);
    } else {
      console.log(`[${type}] ${title}: ${msg}`);
    }
  }

  async function carregarReservas() {
    const response = await apiFetch("/reservas/historico");

    if (!response || !response.ok) {
      const texto = response ? await response.text() : "";
      throw new Error(texto || "Erro ao buscar reservas.");
    }

    reservas = await response.json();

    return reservas;
  }

  function dataISO(date) {
    return date.toISOString().slice(0, 10);
  }

  function mesmoDia(reserva, iso) {
    return reserva.dataReserva === iso || reserva.data === iso;
  }

  function formatarDataLonga(date) {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function horaCurta(hora) {
    if (!hora) return "—";
    return String(hora).slice(0, 5);
  }

  function renderCalendario() {
    const grid = document.getElementById("cal-grid");
    const title = document.getElementById("cal-title");
    const monthLabel = document.getElementById("cal-month-label");

    if (!grid) return;

    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();

    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);

    const inicioSemana = primeiroDia.getDay();
    const totalDias = ultimoDia.getDate();

    if (title) {
      title.textContent = dataAtual.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
      });
    }

    if (monthLabel) {
      monthLabel.textContent = `Reservas de ${dataAtual.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
      })}`;
    }

    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    let html = diasSemana.map(dia => `
      <div class="cal-weekday">${dia}</div>
    `).join("");

    for (let i = 0; i < inicioSemana; i++) {
      html += `<div class="cal-day empty"></div>`;
    }

    const hojeIso = dataISO(new Date());

    for (let dia = 1; dia <= totalDias; dia++) {
      const date = new Date(ano, mes, dia);
      const iso = dataISO(date);

      const reservasDia = reservas.filter(r => mesmoDia(r, iso));

      html += `
        <button class="cal-day ${iso === hojeIso ? "today" : ""}" data-date="${iso}">
          <span class="cal-day-num">${dia}</span>
          ${
            reservasDia.length
              ? `<span class="cal-event-dot">${reservasDia.length}</span>`
              : ""
          }
        </button>
      `;
    }

    grid.innerHTML = html;

    grid.querySelectorAll(".cal-day[data-date]").forEach(btn => {
      btn.addEventListener("click", () => {
        const iso = btn.dataset.date;
        renderEventosDoDia(iso);
      });
    });

    renderEventosDoDia(hojeIso);
  }

  function renderEventosDoDia(iso) {
    const title = document.getElementById("cal-sidebar-title");
    const date = document.getElementById("cal-sidebar-date");
    const list = document.getElementById("cal-event-list");

    if (!list) return;

    const d = new Date(`${iso}T12:00:00`);

    if (title) {
      title.textContent = "Reservas do dia";
    }

    if (date) {
      date.textContent = formatarDataLonga(d);
    }

    const eventos = reservas.filter(r => mesmoDia(r, iso));

    if (!eventos.length) {
      list.innerHTML = `
        <div class="grupo-empty">
          Nenhuma reserva neste dia.
        </div>
      `;
      return;
    }

    list.innerHTML = eventos.map((r, index) => `
      <div class="cal-event-item" data-event-index="${index}">
        <strong>${r.nomeSala || r.salaNome || "Sala"}</strong>
        <small>
          ${horaCurta(r.horarioInicio)} - ${horaCurta(r.horarioFim)}
          &nbsp;•&nbsp;
          Assento ${r.posicaoAssento || "—"}
        </small>
      </div>
    `).join("");
  }

  window.initCalendario = async function () {
    try {
      await carregarReservas();
      renderCalendario();

      document.getElementById("cal-prev")?.addEventListener("click", () => {
        dataAtual = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - 1, 1);
        renderCalendario();
      });

      document.getElementById("cal-next")?.addEventListener("click", () => {
        dataAtual = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 1);
        renderCalendario();
      });

    } catch (error) {
      console.error(error);
      toast("Erro", "Não foi possível carregar o calendário.", "error");
    }
  };
})();