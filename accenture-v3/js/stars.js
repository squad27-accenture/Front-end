/* ══ stars.js ════════════════════════════════════════════════════════ */
function initStars() {
  const cfg = [
    { id: 'star-layer-1', n: 700, spread: 2000, color: 'rgba(255,255,255,0.9)' },
    { id: 'star-layer-2', n: 200, spread: 2000, color: 'rgba(200,170,255,0.8)' },
    { id: 'star-layer-3', n: 100, spread: 2000, color: 'rgba(168,85,247,0.7)' }
  ];
  cfg.forEach(({ id, n, spread, color }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const shadows = Array.from({ length: n }, () =>
      `${Math.floor(Math.random()*spread)}px ${Math.floor(Math.random()*spread)}px ${color}`
    ).join(',');
    el.style.boxShadow = shadows;
    const style = document.createElement('style');
    style.textContent = `#${id}::after{box-shadow:${shadows};}`;
    document.head.appendChild(style);
  });
}
document.addEventListener('DOMContentLoaded', initStars);
