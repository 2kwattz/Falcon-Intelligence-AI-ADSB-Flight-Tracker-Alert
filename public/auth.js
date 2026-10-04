(() => {
  const $ = (selector, root = document) => root.querySelector(selector);

  const ensureDeviceId = () => {
    const storageKey = "falconDeviceId";
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;

    const fallbackUuid = () => "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
      (Number(char) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(char) / 4).toString(16)
    );

    const id = crypto.randomUUID ? crypto.randomUUID() : fallbackUuid();
    localStorage.setItem(storageKey, id);
    return id;
  };

  const setStatus = (form, message, isError = false) => {
    const status = $(".status", form);
    status.textContent = message;
    status.classList.toggle("error", isError);
  };

  const submitAuthForm = async (form, endpoint, successMessage) => {
    const button = $('button[type="submit"]', form);
    button.disabled = true;
    setStatus(form, "Submitting...");

    try {
      const payload = Object.fromEntries(new FormData(form));
      payload.deviceId = ensureDeviceId();

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.status === false) {
        throw new Error(result.message || result.error || "Unable to complete request.");
      }

      if (result.token) localStorage.setItem("falconToken", result.token);
      setStatus(form, successMessage);
    } catch (error) {
      setStatus(form, error.message || "Unable to complete request.", true);
    } finally {
      button.disabled = false;
    }
  };

  const initMenu = () => {
    const menu = $(".menu-button");
    const links = $(".nav-links");
    if (!menu || !links) return;

    menu.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      menu.setAttribute("aria-expanded", String(open));
      menu.textContent = open ? "\u00d7" : "\u2630";
    });

    links.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      links.classList.remove("open");
      menu.setAttribute("aria-expanded", "false");
      menu.textContent = "\u2630";
    }));
  };

  const initForms = () => {
    const loginForm = $("#login-form");
    const registerForm = $("#register-form");

    if (loginForm) {
      loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        submitAuthForm(loginForm, "/auth/login", "Login successful.");
      });
    }

    if (registerForm) {
      const referenceInput = $('input[name="registrationReferenceId"]', registerForm);

      referenceInput.addEventListener("input", () => {
        if (referenceInput.value.trim()) {
          setStatus(registerForm, "Invalid Registration Referal", true);
        } else {
          setStatus(registerForm, "");
        }
      });

      registerForm.addEventListener("submit", (event) => {
        event.preventDefault();
        setStatus(registerForm, "Invalid Registration Referal", true);
      });
    }
  };

  initMenu();
  initForms();
})();
