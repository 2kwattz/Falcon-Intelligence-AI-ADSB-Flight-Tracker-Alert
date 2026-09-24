(() => {
  const endpoint = "/api/aircraft/search";
  const $ = (selector) => document.querySelector(selector);
  const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
  const display = (value, fallback = "—") => value === undefined || value === null || String(value).trim() === "" ? fallback : String(value).trim();
  const field = (aircraft, ...names) => names.map((name) => aircraft[name]).find((value) => value !== undefined && value !== null && value !== "");
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[char]);
  const format = (value, suffix = "") => { const number = finite(value); return number === null ? "—" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(number) + suffix; };
  const callsign = (aircraft) => display(field(aircraft, "callsign", "flight"), display(aircraft.hex));

  function setStatus(message, state = "") {
    const status = $("#search-status");
    status.className = "search-status" + (state ? " " + state : "");
    status.innerHTML = "<i></i> " + escapeHtml(message);
  }

  function renderProviders(sources = []) {
    const container = $("#provider-status");
    container.innerHTML = sources.map((source) => {
      const label = source.ok
        ? source.name + " · " + Number(source.count || 0).toLocaleString() + " signals"
        : source.name + " · " + display(source.error, "Unavailable");
      return `<span class="provider-chip ${source.ok ? "available" : "unavailable"}">${escapeHtml(label)}</span>`;
    }).join("");
  }

  function aircraftCard(aircraft) {
    const latitude = finite(field(aircraft, "lat", "latitude"));
    const longitude = finite(field(aircraft, "lon", "longitude"));
    const position = latitude !== null && longitude !== null ? latitude.toFixed(4) + "°, " + longitude.toFixed(4) + "°" : "Position not reported";
    const sources = Array.isArray(aircraft.sources) ? aircraft.sources : [];
    const sourceLabel = sources.length > 1 ? sources.length + " sources" : display(sources[0], "live");
    return `<article class="aircraft-result"><div class="result-heading"><div><h3>${escapeHtml(callsign(aircraft))}</h3><span class="icao">${escapeHtml(display(field(aircraft, "hex", "icao", "icao24")))}</span></div><span class="source-badge">${escapeHtml(sourceLabel)}</span></div><div class="result-grid"><div><span>Registration</span><strong>${escapeHtml(display(field(aircraft, "r", "registration")))}</strong></div><div><span>Aircraft</span><strong>${escapeHtml(display(field(aircraft, "t", "type", "typeCode")))}</strong></div><div><span>Altitude</span><strong>${escapeHtml(format(field(aircraft, "alt_baro", "alt_geom", "altitude"), " ft"))}</strong></div><div><span>Ground speed</span><strong>${escapeHtml(format(field(aircraft, "gs", "groundSpeed", "speed"), " kt"))}</strong></div></div><p class="result-position">${escapeHtml(position)}</p></article>`;
  }

  function renderResults(aircraft, callsignValue) {
    const container = $("#search-results");
    if (!aircraft.length) {
      container.innerHTML = `<div class="empty-state"><span aria-hidden="true">⌁</span><h3>No live signal found for ${escapeHtml(callsignValue)}</h3><p>The callsign may not currently be broadcasting, or it may be outside the providers’ available coverage.</p></div>`;
      return;
    }

    container.innerHTML = aircraft.map(aircraftCard).join("");
  }

  async function search(callsignValue) {
    const callsign = callsignValue.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,12}$/.test(callsign)) {
      setStatus("Use 2–12 letters or numbers", "error");
      $("#callsign-input").focus();
      return;
    }

    const button = $("#callsign-form button");
    button.disabled = true;
    button.textContent = "Searching…";
    $("#results-title").textContent = "Searching " + callsign;
    setStatus("Querying live providers");
    $("#provider-status").innerHTML = "";

    try {
      const response = await fetch(endpoint + "?" + new URLSearchParams({ callsign }), { headers: { Accept: "application/json" }, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.status) throw new Error(payload.message || "Search could not be completed");

      $("#results-title").textContent = Number(payload.count || 0).toLocaleString() + " aircraft for " + payload.callsign;
      renderProviders(payload.sources);
      renderResults(payload.aircraft, payload.callsign);
      setStatus("Live results updated", "ready");
    } catch (error) {
      $("#results-title").textContent = "Search unavailable";
      $("#search-results").innerHTML = `<div class="empty-state"><span aria-hidden="true">!</span><h3>Could not search the live aircraft feeds</h3><p>${escapeHtml(error.message)}. Please try again in a moment.</p></div>`;
      setStatus("Search failed", "error");
    } finally {
      button.disabled = false;
      button.innerHTML = "<span aria-hidden=\"true\">⌕</span> Search";
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    const form = $("#callsign-form");
    form.addEventListener("submit", (event) => { event.preventDefault(); search($("#callsign-input").value); });
    document.querySelectorAll("[data-callsign]").forEach((button) => button.addEventListener("click", () => { $("#callsign-input").value = button.dataset.callsign; search(button.dataset.callsign); }));
    const menuButton = $("#explore-menu-button");
    const navLinks = $("#explore-nav-links");
    menuButton.addEventListener("click", () => { const open = navLinks.classList.toggle("open"); menuButton.setAttribute("aria-expanded", String(open)); menuButton.textContent = open ? "×" : "☰"; });
    navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => { navLinks.classList.remove("open"); menuButton.setAttribute("aria-expanded", "false"); menuButton.textContent = "☰"; }));
  });
})();
