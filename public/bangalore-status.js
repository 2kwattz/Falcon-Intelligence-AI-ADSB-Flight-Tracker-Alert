(() => {
  const statusEndpoint = "/api/bangalore-iaf-alert-status";
  const nearbyEndpoint = "/api/adsbhub-tcp/nearby/12.9716/77.5946/100?limit=12";
  const refreshInterval = 1000;
  const $ = (selector) => document.querySelector(selector);

  const text = (value, fallback = "--") => value === undefined || value === null || String(value).trim() === "" ? fallback : String(value).trim();
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
  const formatTime = (value) => value ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value)) : "--";
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[char]);
  const format = (value, suffix = "") => {
    const n = number(value);
    return n === null ? "--" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n) + suffix;
  };

  function setPill(connected, failed = false, awaitingData = false) {
    const pill = $("#status-pill");
    pill.className = "feed-status" + (failed ? " error" : connected && !awaitingData ? " connected" : "");
    pill.innerHTML = "<span></span>" + (failed ? " API unavailable" : awaitingData ? " Waiting for ADSBHub data" : connected ? " Bangalore API live" : " Waiting for feed");
  }

  function renderNearby(payload) {
    const aircraft = Array.isArray(payload.aircraft) ? payload.aircraft : [];
    $("#metric-nearby").textContent = Number(payload.totalInRadius || payload.count || 0).toLocaleString();
    $("#nearby-updated").textContent = "Updated " + formatTime(payload.updatedAt);

    $("#nearby-aircraft").innerHTML = aircraft.length
      ? aircraft.map((item) => `<div class="aircraft-row"><div><strong>${escapeHtml(text(item.callsign, item.hex))}</strong><small>${escapeHtml(text(item.hex))} · ${format(item.altitude, " ft")} · ${format(item.groundSpeed, " kt")}</small></div><span class="distance">${format(item.distanceMiles, " mi")}</span></div>`).join("")
      : `<div class="empty-state">No aircraft with current positions inside the Bangalore 100-mile radius.</div>`;
  }

  function renderStatus(payload) {
    const connection = payload.connection || {};
    const connected = Boolean(connection.connected);
    const awaitingData = connection.state === "connected-awaiting-data" || (connected && !connection.lastMessageAt);
    const failed = Boolean(payload.lastError);
    setPill(connected, failed, awaitingData);

    $("#metric-status").textContent = failed ? "Error" : awaitingData ? "Waiting" : "Live";
    $("#metric-error").textContent = payload.lastError || connection.warning || "Polling without reported errors";
    $("#metric-feed").textContent = awaitingData ? "Connected, no data" : connected ? "Connected" : "Reconnecting";
    $("#metric-feed-detail").textContent = `${Number(connection.aircraftCount || 0).toLocaleString()} aircraft in TCP memory, ${Number(connection.receivedLines || 0).toLocaleString()} SBS lines`;
    $("#metric-matches").textContent = Number(payload.lastMatches?.length || 0).toLocaleString();
    $("#status-updated").textContent = "Polled " + formatTime(payload.lastRunAt);
  }

  async function refresh() {
    try {
      const [statusResponse, nearbyResponse] = await Promise.all([
        fetch(statusEndpoint, { headers: { Accept: "application/json" }, cache: "no-store" }),
        fetch(nearbyEndpoint, { headers: { Accept: "application/json" }, cache: "no-store" })
      ]);

      if (!statusResponse.ok) throw new Error("Status endpoint returned " + statusResponse.status);
      if (!nearbyResponse.ok) throw new Error("Nearby endpoint returned " + nearbyResponse.status);

      const statusPayload = await statusResponse.json();
      const nearbyPayload = await nearbyResponse.json();

      renderStatus(statusPayload);
      renderNearby(nearbyPayload);
      $("#raw-response").textContent = JSON.stringify({ status: statusPayload, nearby: nearbyPayload }, null, 2);
    } catch (error) {
      setPill(false, true);
      $("#metric-status").textContent = "Error";
      $("#metric-error").textContent = error.message || "Unable to refresh";
      $("#raw-response").textContent = JSON.stringify({ error: error.message || String(error) }, null, 2);
    }
  }

  function initMenu() {
    const menuButton = $("#status-menu-button");
    const navLinks = $("#status-nav-links");
    if (!menuButton || !navLinks) return;

    menuButton.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.textContent = open ? "\u00d7" : "\u2630";
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    initMenu();
    refresh();
    window.setInterval(refresh, refreshInterval);
  });
})();
