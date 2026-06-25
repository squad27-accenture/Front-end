/* ══ relatorios.js — relatórios reais com reservas/salas ═══════════ */

(function () {
  let reservas = [];
  let salas = [];

  function toast(title, msg, type = "info") {
    if (typeof showToast === "function") {
      showToast(title, msg, type);
    } else {
      console.log(`[${type}] ${title}: ${msg}`);
    }
  }

  async function fetchJson(path) {
    const response = await apiFetch(path);

    if (!response || !response.ok) {
      const texto = response ? await response.text() : "";
      throw new Error(texto || `Erro ao buscar ${path}`);
    }

    return response.json();
  }

  function horasEntre(inicio, fim) {
    if (!inicio || !fim) return 0;

    const [hi, mi] = String(inicio).split(":").map(Number);
    const [hf, mf] = String(fim).split(":").map(Number);

    const minInicio = hi * 60 + mi;
    const minFim = hf * 60 + mf;

    return Math.max(0, (minFim - minInicio) / 60);
  }

  function reservasAtivas() {
    return reservas.filter(r => {
      const status = r.statusReserva || r.status || "CONFIRMADA";
      return status !== "CANCELADA";
    });
  }

  function rankingSalas() {
    const mapa = {};

    reservasAtivas().forEach(r => {
      const nome = r.nomeSala || r.salaNome || r.sala?.nome || "Sala sem nome";
      mapa[nome] = (mapa[nome] || 0) + 1;
    });

    return Object.entries(mapa)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);
  }

  function atualizarMiniStats() {
    const minis = document.querySelectorAll(".relatorios-mini-stats .mini-stat");

    const ativas = reservasAtivas();

    const totalReservas = ativas.length;

    const horas = ativas.reduce((acc, r) => {
      return acc + horasEntre(r.horarioInicio, r.horarioFim);
    }, 0);

    const ranking = rankingSalas();
    const salaMaisUsada = ranking[0]?.nome || "—";

    const canceladas = reservas.filter(r => {
      const status = r.statusReserva || r.status;
      return status === "CANCELADA";
    }).length;

    const taxaCancelamento = reservas.length
      ? Math.round((canceladas / reservas.length) * 100)
      : 0;

    if (minis[0]) {
      minis[0].querySelector(".mini-stat-label").textContent = "Total de reservas";
      minis[0].querySelector(".mini-stat-value").textContent = totalReservas;
    }

    if (minis[1]) {
      minis[1].querySelector(".mini-stat-label").textContent = "Horas reservadas";
      minis[1].querySelector(".mini-stat-value").textContent = `${horas.toFixed(1)}h`;
    }

    if (minis[2]) {
      minis[2].querySelector(".mini-stat-label").textContent = "Sala mais usada";
      minis[2].querySelector(".mini-stat-value").textContent = salaMaisUsada;
    }

    if (minis[3]) {
      minis[3].querySelector(".mini-stat-label").textContent = "Cancelamentos";
      minis[3].querySelector(".mini-stat-value").textContent = `${taxaCancelamento}%`;
    }
  }

  function atualizarBarras() {
    const ranking = rankingSalas().slice(0, 5);

    const barCharts = document.querySelectorAll(".relatorios-charts ~ div .bar-chart, .relatorios-charts .bar-chart");

    const chart = barCharts[0];

    if (!chart) return;

    if (!ranking.length) {
      chart.innerHTML = `
        <div class="grupo-empty">
          Nenhuma reserva encontrada.
        </div>
      `;
      return;
    }

    const maior = Math.max(...ranking.map(r => r.total));

    chart.innerHTML = ranking.map(item => {
      const width = maior > 0
        ? Math.round((item.total / maior) * 100)
        : 0;

      return `
        <div class="bar-row">
          <span class="bar-label">${item.nome}</span>

          <div class="bar-track">
            <div class="bar-fill" data-width="${width}" style="width:${width}%"></div>
          </div>

          <span class="bar-value">${item.total}</span>
        </div>
      `;
    }).join("");
  }

  function atualizarDonut() {
    const svg = document.getElementById("donut-svg");
    const legend = document.getElementById("donut-legend");

    if (!svg || !legend) return;

    const ranking = rankingSalas().slice(0, 4);

    svg.innerHTML = "";
    legend.innerHTML = "";

    if (!ranking.length) {
      legend.innerHTML = `<div class="grupo-empty">Sem dados.</div>`;
      return;
    }

    const total = ranking.reduce((acc, item) => acc + item.total, 0);

    let offset = 25;

    ranking.forEach((item, index) => {
      const pct = total ? item.total / total : 0;
      const dash = pct * 100;

      svg.insertAdjacentHTML("beforeend", `
        <circle
          cx="70"
          cy="70"
          r="45"
          fill="none"
          stroke="currentColor"
          stroke-width="16"
          stroke-dasharray="${dash} ${100 - dash}"
          stroke-dashoffset="${offset}"
          transform="rotate(-90 70 70)"
          opacity="${1 - index * 0.18}"
        ></circle>
      `);

      offset -= dash;

      legend.insertAdjacentHTML("beforeend", `
        <div class="donut-legend-item">
          <span class="donut-dot"></span>
          <span>${item.nome}</span>
          <strong>${item.total}</strong>
        </div>
      `);
    });

    const center = document.querySelector(".donut-center strong");
    if (center) center.textContent = total;
  }

  async function carregarTudo() {
    reservas = await fetchJson("/reservas/historico");
    salas = await fetchJson("/salas");

    atualizarMiniStats();
    atualizarBarras();
    atualizarDonut();

    console.log("Relatórios carregados:", {
      reservas,
      salas
    });
  }

  window.initRelatorios = async function () {
  try {
    await carregarTudo();
    wireExportPdfReal();
  } catch (error) {
    console.error(error);
    toast("Erro", "Não foi possível carregar relatórios.", "error");
  }
};
 async function exportarPdfRelatorio() {
  const section =
    document.getElementById("section-relatorios") ||
    document.querySelector('.dash-section[data-section="relatorios"]');

  if (!section) {
    toast("Erro", "Área de relatórios não encontrada.", "error");
    return;
  }

  if (!window.html2canvas || !window.jspdf) {
    toast("Erro", "Bibliotecas de PDF não carregaram.", "error");
    return;
  }

  const btn = document.getElementById("btn-export-pdf");

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "Gerando PDF...";
    }

    const wasActive = section.classList.contains("active");
    section.classList.add("active");
    section.classList.add("pdf-exporting");

    await new Promise(resolve => setTimeout(resolve, 400));

    const canvas = await html2canvas(section, {
      scale: 2,
      useCORS: true,
      backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
      ignoreElements: element => element.id === "btn-export-pdf"
    });

    const imgData = canvas.toDataURL("image/png");

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 8;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);

    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    const hoje = new Date().toISOString().slice(0, 10);

    pdf.save(`relatorio-roomflow-${hoje}.pdf`);

    toast("PDF gerado", "Relatório exportado com sucesso.", "success");

    if (!wasActive) {
      section.classList.remove("active");
    }

  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    toast("Erro", "Não foi possível gerar o PDF.", "error");

  } finally {
    section.classList.remove("pdf-exporting");

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Exportar PDF
      `;
    }
  }
}

function wireExportPdfReal() {
  const oldBtn = document.getElementById("btn-export-pdf");

  if (!oldBtn) return;

  const btn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(btn, oldBtn);

  btn.addEventListener("click", exportarPdfRelatorio);
}

function carregarScriptPdf(src) {
  return new Promise((resolve, reject) => {
    const jaExiste = Array.from(document.scripts).some(script => script.src === src);

    if (jaExiste) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function garantirBibliotecasPdf() {
  if (!window.html2canvas) {
    await carregarScriptPdf("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
  }

  if (!window.jspdf) {
    await carregarScriptPdf("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  }
}

async function exportarPdfRelatorio() {
  const section =
    document.getElementById("section-relatorios") ||
    document.querySelector('.dash-section[data-section="relatorios"]');

  if (!section) {
    toast("Erro", "Área de relatórios não encontrada.", "error");
    return;
  }

  const btn = document.getElementById("btn-export-pdf");

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Gerando PDF...";
    }

    await garantirBibliotecasPdf();

    if (!window.html2canvas || !window.jspdf) {
      toast("Erro", "Bibliotecas de PDF não carregaram.", "error");
      return;
    }

    section.classList.add("active");

    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await window.html2canvas(section, {
      scale: 2,
      useCORS: true,
      backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
      ignoreElements: element => element.id === "btn-export-pdf"
    });

    const imgData = canvas.toDataURL("image/png");

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 8;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);

    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    const hoje = new Date().toISOString().slice(0, 10);
    pdf.save(`relatorio-roomflow-${hoje}.pdf`);

    toast("PDF gerado", "Relatório exportado com sucesso.", "success");

  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    toast("Erro", "Não foi possível gerar o PDF.", "error");

  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Exportar PDF
      `;
    }
  }
}

function wireExportPdfReal() {
  const oldBtn = document.getElementById("btn-export-pdf");

  if (!oldBtn) {
    console.warn("Botão de PDF não encontrado.");
    return;
  }

  const btn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(btn, oldBtn);

  btn.addEventListener("click", exportarPdfRelatorio);
}
})();