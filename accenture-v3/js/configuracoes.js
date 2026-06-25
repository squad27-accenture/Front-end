/* ══ configuracoes.js ═══════════════════════════════════════════════ */
(function () {

  /* ── Config nav ──────────────────────────────────────────────── */
  function wireConfigNav() {
    document.querySelectorAll('.config-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.config-nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.config-section').forEach(s => s.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('config-' + item.dataset.config)?.classList.add('active');
      });
    });
  }

  /* ── Load perfil ─────────────────────────────────────────────── */
  function loadPerfil() {
    const perfil = RF.getPerfil();
    const nameInput  = document.getElementById('config-name-input');
    const emailInput = document.getElementById('config-email-input');
    if (nameInput)  nameInput.value  = perfil.name  || '';
    if (emailInput) emailInput.value = perfil.email || '';
    updateHeaderAvatar(perfil.avatar, perfil.name);
  }

  /* ── Update ONLY header avatar (not table avatars) ───────────── */
  function updateHeaderAvatar(avatarData, name) {
    // FIX: só atualiza os avatares do header/chip, não os da tabela de usuários
    const headerAvatars = document.querySelectorAll(
      '.user-chip .user-avatar, #user-chip .user-avatar, #user-avatar, #config-avatar'
    );
    const initials = (name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

    headerAvatars.forEach(el => {
      if (avatarData) {
        el.innerHTML = `<img src="${avatarData}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      } else {
        el.innerHTML = initials;
        el.style.backgroundImage = '';
      }
    });
  }

  /* ── Photo upload ────────────────────────────────────────────── */
  function wirePhotoUpload() {
    const preview   = document.getElementById('config-avatar');
    const fileInput = document.getElementById('avatar-file-input');
    if (!preview || !fileInput) return;

    preview.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file || !file.type.startsWith('image/')) {
        showToast('Arquivo inválido', 'Use imagens JPG ou PNG.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        const data = ev.target.result;
        RF.savePerfil({ avatar: data });
        updateHeaderAvatar(data, document.getElementById('config-name-input')?.value);
        showToast('Foto atualizada!', 'Sua foto de perfil foi salva.', 'success');
      };
      reader.readAsDataURL(file);
    });
  }

  /* ── Save perfil ─────────────────────────────────────────────── */
  function wireSavePerfil() {
    document.getElementById('save-profile-btn')?.addEventListener('click', () => {
      const name  = document.getElementById('config-name-input')?.value.trim();
      const email = document.getElementById('config-email-input')?.value.trim();
      if (!name || !email) { showToast('Campos obrigatórios', 'Preencha nome e e-mail.', 'error'); return; }

      RF.savePerfil({ name, email });

      // Update display name only in header
      document.querySelectorAll('#user-display-name').forEach(el => el.textContent = name.split(' ')[0]);
      const adEmail = document.getElementById('account-dropdown-email');
      const adName  = document.getElementById('account-dropdown-name');
      if (adEmail) adEmail.textContent = email;
      if (adName)  adName.textContent  = name;

      const perfil = RF.getPerfil();
      if (!perfil.avatar) updateHeaderAvatar(null, name);

      showToast('Perfil salvo!', 'Informações atualizadas.', 'success');
    });
  }

  /* ── Dark mode toggle ────────────────────────────────────────── */
  function wireDarkToggle() {
    const toggle = document.getElementById('config-dark-toggle');
    if (!toggle) return;
    toggle.checked = document.body.dataset.effectiveTheme === 'dark';
    toggle.addEventListener('change', () => {
      applyTheme(toggle.checked ? 'dark' : 'light');
      window.dispatchEvent(new Event('themechange'));
    });
    window.addEventListener('themechange', () => {
      toggle.checked = document.body.dataset.effectiveTheme === 'dark';
    });
  }

  /* ── Logout — FIX: wired globally from dashboard.js ─────────── */
  // Logout is now handled globally in dashboard.js to fix the dropdown bug.
  // This is kept for the config section logout button only.
  function wireLogout() {
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
      btn.addEventListener('click', () => {
        clearSession();
        window.location.href = '../index.html';
      });
    });
  }

  window.initConfiguracoes = function () {
    wireConfigNav();
    loadPerfil();
    wirePhotoUpload();
    wireSavePerfil();
    wireDarkToggle();
    wireLogout();
  };

  window.reloadPerfil = loadPerfil;
})();
