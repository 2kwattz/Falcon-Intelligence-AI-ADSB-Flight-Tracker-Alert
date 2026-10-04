(() => {
  const $ = (selector) => document.querySelector(selector);
  const form = $("#donation-form");
  const status = $("#payment-status");
  const donateButton = $("#donate-button");

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
