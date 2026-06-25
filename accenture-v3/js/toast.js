/* ══ toast.js ════════════════════════════════════════════════════════ */
function showToast(title, desc = '', type = 'success') {
  let box = document.getElementById('toast-container');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast-container';
    box.className = 'toast-container';
    document.body.appendChild(box);
  }

  const ICONS = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`
  };

  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `<span class="toast-icon">${ICONS[type] || ICONS.info}</span>
    <div class="toast-body"><p class="toast-title">${title}</p>${desc ? `<p class="toast-desc">${desc}</p>` : ''}</div>`;
  box.appendChild(el);

  const ms = type === 'error' ? 4500 : 3000;
  setTimeout(() => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 300);
  }, ms);
}
