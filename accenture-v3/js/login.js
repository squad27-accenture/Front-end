/* ══ login.js — tela de login conectada ao backend Spring ══════════ */

document.addEventListener("DOMContentLoaded", () => {

  initTheme();

  if (getSession() && getAccessToken()) {
    window.location.href = "pages/dashboard.html";
    return;
  }

  function setScreen(name) {
    document.querySelectorAll(".auth-screen").forEach(screen => {
      screen.classList.toggle("active", screen.dataset.screen === name);
    });
  }

  document.querySelectorAll("[data-screen-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      setScreen(btn.dataset.screenToggle);
    });
  });

  const emailEl = document.getElementById("login-email");
  const passEl = document.getElementById("login-password");
  const rememberEl = document.getElementById("remember-me");

  const saved = getRemembered();

  if (saved && emailEl && passEl) {
    emailEl.value = saved.email;
    passEl.value = saved.senha || saved.password || "";

    if (rememberEl) {
      rememberEl.checked = true;
    }
  }

  function redirect(delay = 700) {
    setTimeout(() => {
      window.location.href = "pages/dashboard.html";
    }, delay);
  }

  const PROVIDER_LABEL = {
    google: "Google",
    microsoft: "Microsoft",
    linkedin: "LinkedIn"
  };

  document.querySelectorAll("[data-oauth]").forEach(btn => {
    btn.addEventListener("click", () => {
      const provider = btn.dataset.oauth;

      showToast(
        "OAuth indisponível",
        `Login com ${PROVIDER_LABEL[provider] || provider} ainda não foi conectado ao backend.`,
        "error"
      );
    });
  });

  document.querySelectorAll("form[data-form-type]").forEach(form => {
    form.addEventListener("submit", async event => {
      event.preventDefault();

      const type = form.dataset.formType;

      if (type === "login") {
        const email = emailEl?.value.trim() || "";
        const senha = passEl?.value || "";

        if (!email || !senha) {
          showToast("Preencha todos os campos", "", "error");
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Entrando...";
        }

        const result = await loginUser(email, senha);

        if (result.ok) {
          window.location.href = "pages/dashboard.html";
        return;
}

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Entrar";
        }

        if (!result.ok) {
          showToast("Erro no login", result.error, "error");
          return;
        }

        if (rememberEl?.checked) {
          saveRemembered(email, senha);
        } else {
          clearRemembered();
        }

        showToast("Login realizado!", "Redirecionando...", "success");
        redirect();
        return;
      }

      if (type === "register") {
        const name = document.getElementById("reg-name")?.value.trim() || "";
        const email = document.getElementById("reg-email")?.value.trim() || "";
        const senha = document.getElementById("reg-password")?.value || "";
        const senha2 = document.getElementById("reg-password-confirm")?.value || "";
        const tipoFuncionario = document.getElementById("reg-tipo-funcionario")?.value || "OUTRO";

        if (!name || !email || !senha) {
          showToast("Preencha todos os campos", "", "error");
          return;
        }

        if (senha !== senha2) {
          showToast("Senhas não coincidem", "Confira os dois campos de senha.", "error");
          return;
        }

        if (senha.length < 6) {
          showToast("Senha muito curta", "Use pelo menos 6 caracteres.", "error");
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Cadastrando...";
        }

        const result = await registerUser({
        name,
        email,
        password: senha,
        tipoFuncionario
});

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Criar conta";
        }

        if (!result.ok) {
          showToast("Erro no cadastro", result.error, "error");
          return;
        }

        showToast("Conta criada!", "Agora faça login.", "success");

        form.reset();
        setScreen("login");
        return;
      }

      if (type === "forgot") {
        const email = document.getElementById("forgot-email")?.value.trim() || "";

        if (!email) {
          showToast("Informe seu e-mail", "", "error");
          return;
        }

        showToast(
          "Ainda não implementado",
          "Recuperação de senha fica para depois.",
          "error"
        );

        setTimeout(() => {
          form.reset();
          setScreen("login");
        }, 1200);
      }
    });
  });
});