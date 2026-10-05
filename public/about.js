(() => {
  const $ = (selector) => document.querySelector(selector);
  const form = $("#donation-form");
  const status = $("#payment-status");
  const donateButton = $("#donate-button");
  const healthGrid = $("#health-grid");
  const healthUpdated = $("#health-updated");

  function setStatus(message, state = "") {
    status.className = "payment-status" + (state ? " " + state : "");
    status.textContent = message;
  }

  function selectedAmount() {
    const customAmount = Number($("#custom-amount").value);

    if (Number.isFinite(customAmount) && customAmount >= 1) {
      return Math.round(customAmount * 100);
    }

    return Number(form.querySelector("input[name=\"amount\"]:checked").value);
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      cache: "no-store",
      ...options
    });
    const payload = await response.json();

    if (!response.ok || !payload.status) throw new Error(payload.message || "Request failed");

    return payload;
  }

  function formatNumber(value) {
    const number = Number(value);

    return Number.isFinite(number) ? number.toLocaleString() : "0";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[char]);
  }

  function formatTime(value) {
    return value
      ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value))
      : "No recent timestamp";
  }

  function formatUptime(seconds) {
    const total = Number(seconds);

    if (!Number.isFinite(total)) return "Uptime unavailable";

    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);

    if (days) return `${days}d ${hours}h uptime`;
    if (hours) return `${hours}h ${minutes}m uptime`;
    return `${minutes}m uptime`;
  }

  function healthCard({ title, ok, state, detail }) {
    return `<article class="health-card ${ok ? "ready" : "error"}"><span></span><h3>${escapeHtml(title)}</h3><strong>${escapeHtml(state)}</strong><p>${escapeHtml(detail)}</p></article>`;
  }

  function renderHealth(payload) {
    const cards = [
      healthCard({
        title: "Website Status",
        ok: payload.website?.status,
        state: payload.website?.state || "unknown",
        detail: formatUptime(payload.website?.uptimeSeconds)
      }),
      healthCard({
        title: "Vadodara Airspace",
        ok: payload.vadodaraAirspace?.status,
        state: payload.vadodaraAirspace?.state || "unknown",
        detail: `${formatNumber(payload.vadodaraAirspace?.aircraftCount)} aircraft, last signal ${formatTime(payload.vadodaraAirspace?.lastMessageAt)}`
      }),
      healthCard({
        title: "Bangalore Airspace",
        ok: payload.bangaloreAirspace?.status,
        state: payload.bangaloreAirspace?.state || "unknown",
        detail: `${formatNumber(payload.bangaloreAirspace?.lastMatches)} latest matches, last poll ${formatTime(payload.bangaloreAirspace?.lastRunAt)}`
      }),
      healthCard({
        title: "ADSB TCP Connection",
        ok: payload.adsbTcpConnection?.status,
        state: payload.adsbTcpConnection?.state || "unknown",
        detail: payload.adsbTcpConnection?.warning || `${formatNumber(payload.adsbTcpConnection?.aircraftCount)} aircraft in memory, last message ${formatTime(payload.adsbTcpConnection?.lastMessageAt)}`
      })
    ];

    healthGrid.innerHTML = cards.join("");
    healthUpdated.textContent = `Checked ${formatTime(payload.checkedAt)}`;
  }

  async function loadHealth() {
    try {
      renderHealth(await requestJson("/api/server-health"));
    } catch (error) {
      healthGrid.innerHTML = healthCard({
        title: "Server Health Check",
        ok: false,
        state: "unavailable",
        detail: error.message || "Unable to read server health."
      });
      healthUpdated.textContent = "Health check failed";
    }
  }

  async function openCheckout(amount) {
    if (!window.Razorpay) throw new Error("Razorpay checkout script did not load.");

    const [{ key_id: keyId }, order] = await Promise.all([
      requestJson("/api/razorpay-key"),
      requestJson("/api/create-order", {
        method: "POST",
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: "falcon_donation_" + Date.now()
        })
      })
    ]);

    return new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Falcon Intelligence",
        description: "Donation support",
        order_id: order.order_id,
        handler: resolve,
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled."))
        },
        theme: {
          color: "#56d8b7"
        }
      });

      checkout.on("payment.failed", (response) => {
        const message = response?.error?.description || "Payment failed. Please try again.";
        reject(new Error(message));
      });

      checkout.open();
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    const menuButton = $("#about-menu-button");
    const navLinks = $("#about-nav-links");

    menuButton.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.textContent = open ? "\u00d7" : "\u2630";
    });

    navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.textContent = "\u2630";
    }));

    loadHealth();
    window.setInterval(loadHealth, 30000);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const amount = selectedAmount();

      if (!Number.isInteger(amount) || amount < 100) {
        setStatus("Donation amount must be at least INR 1.", "error");
        return;
      }

      donateButton.disabled = true;
      setStatus("Opening Razorpay checkout...");

      try {
        const payment = await openCheckout(amount);
        await requestJson("/api/verify-payment", {
          method: "POST",
          body: JSON.stringify({
            razorpay_payment_id: payment.razorpay_payment_id,
            razorpay_order_id: payment.razorpay_order_id,
            razorpay_signature: payment.razorpay_signature
          })
        });
        setStatus("Thank you. Your donation payment was verified.", "success");
        form.reset();
        form.querySelector("input[name=\"amount\"]").checked = true;
      } catch (error) {
        setStatus(error.message || "Unable to complete payment.", "error");
      } finally {
        donateButton.disabled = false;
      }
    });
  });
})();
