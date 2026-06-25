/* ══ sidebar.js — menu com permissões por role ═════════════════════ */

function initSidebar(showSection) {
  const navItems = document.querySelectorAll('.nav-item[data-section]');

  navItems.forEach(item => {
    const section = item.dataset.section;

    if (!canAccessSection(section)) {
      item.style.display = "none";
      item.setAttribute("aria-hidden", "true");
      return;
    }

    item.style.display = "";

    item.addEventListener('click', e => {
      e.preventDefault();

      if (!canAccessSection(section)) {
        showToast(
          "Acesso negado",
          "Você não tem permissão para acessar essa área.",
          "error"
        );
        return;
      }

      navItems.forEach(x => x.classList.remove('active'));
      item.classList.add('active');

      showSection(section);
    });
  });
}