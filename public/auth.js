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

  const submitAuthForm = async (form, endpoint, successMessage, payloadOverride, handleResponse) => {
    const button = $('button[type="submit"]', form);
    button.disabled = true;
    setStatus(form, "Submitting...");

    try {
      const payload = payloadOverride || Object.fromEntries(new FormData(form));
      payload.deviceId = ensureDeviceId();

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (handleResponse && handleResponse(result, response)) return;
      if (!response.ok || result.status === false) {
        throw new Error(result.message || result.error || "Unable to complete request.");
      }

      setStatus(form, successMessage);

      if (endpoint === "/auth/mongo/login" || endpoint === "/auth/mongo/login/verify-otp") {
        window.setTimeout(() => window.location.assign("/dashboard"), 300);
      }
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
      let twoFactorChallengeId = null;
      let otpExpiresAt = 0;
      let otpCountdownTimer = null;
      const otpField = $("#login-otp-field", loginForm);
      const otpInput = $("input[name=\"otp\"]", loginForm);
      const otpCountdown = $("#login-otp-countdown", loginForm);
      const loginButton = $('button[type="submit"]', loginForm);

      const stopOtpCountdown = () => {
        if (otpCountdownTimer) window.clearInterval(otpCountdownTimer);
        otpCountdownTimer = null;
      };

      const resetOtpChallenge = (message) => {
        stopOtpCountdown();
        twoFactorChallengeId = null;
        otpExpiresAt = 0;
        otpInput.value = "";
        otpInput.required = false;
        otpField.hidden = true;
        otpCountdown.textContent = "";
        otpCountdown.classList.remove("expired");
        loginButton.textContent = "Log in";
        if (message) setStatus(loginForm, message, true);
      };

      const renderOtpCountdown = () => {
        const remainingSeconds = Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000));
        if (remainingSeconds === 0) {
          resetOtpChallenge("OTP has expired. Log in again to receive a new code.");
          return;
        }
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        otpCountdown.textContent = `OTP expires in ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        otpCountdown.classList.remove("expired");
      };

      const startOtpCountdown = (expiresInSeconds) => {
        stopOtpCountdown();
        otpExpiresAt = Date.now() + expiresInSeconds * 1000;
        renderOtpCountdown();
        otpCountdownTimer = window.setInterval(renderOtpCountdown, 250);
      };

      loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        // Accounts created in MongoDB authenticate through the isolated JWT
        // endpoint. The legacy MySQL login remains available at `/auth/login`.
        if (twoFactorChallengeId) {
          submitAuthForm(loginForm, "/auth/mongo/login/verify-otp", "Two-factor authentication verified. Login successful.", {
            challengeId: twoFactorChallengeId,
            otp: otpInput.value
          });
          return;
        }
        submitAuthForm(loginForm, "/auth/mongo/login", "Login successful.", null, (result) => {
          if (!result.requiresTwoFactorOtp) return false;
          twoFactorChallengeId = result.challengeId;
          otpField.hidden = false;
          otpInput.required = true;
          otpInput.value = "";
          otpInput.focus();
          loginButton.textContent = "Verify and log in";
          startOtpCountdown(Math.max(1, Number(result.expiresInSeconds) || 300));
          window.FalconToast?.show("A two-factor authentication code was sent to your registered email address.", { tone: "success" });
          setStatus(loginForm, result.message);
          return true;
        });
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
