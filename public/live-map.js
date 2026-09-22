(() => {
  const endpoint = "/live-map/aircrafts";
  // The TCP receiver is already in memory, so a one-second UI snapshot keeps
  // positions responsive without opening additional feed connections.
  const refreshInterval = 1000;
  const maximumAircraft = 250;
  const labelZoom = 8;
  const labelLimit = 60;
  const $ = (selector) => document.querySelector(selector);
  const markers = new Map();
  let map;
  let lastAircraft = [];
  let refreshInFlight = false;
  let viewportRefreshTimer;
  let hasLoadedInitialFeed = false;

  const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
  const text = (value, fallback = "—") => value === undefined || value === null || String(value).trim() === "" ? fallback : String(value).trim();
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[char]);
  const format = (value, suffix = "") => { const n = finite(value); return n === null ? "—" : `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)}${suffix}`; };
  const formatTime = (value) => value ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value)) : "—";
  const callsign = (aircraft) => text(aircraft.callsign, aircraft.hex);
  const label = (aircraft) => `${callsign(aircraft)} · ${aircraft.hex}`;

  function aircraftIcon(aircraft) {
    const bearing = finite(aircraft.heading) ?? 0;
    return window.L.divIcon({
      className: "aircraft-marker",
      html: `<span class="aircraft-marker__inner"><svg viewBox="0 0 100 100" style="--bearing:${bearing}deg" aria-hidden="true"><path d="M50 2c-5.8 7.3-7.6 17.8-7.6 28.6l-.8 8-6.1 8-5 4.7L8 72.8v9.6l27.2-4.6 7.2 3.1-10.4 13.1 8.5 4.5L50 90.2l9.5 8.3 8.5-4.5L57.6 80.9l7.2-3.1L92 82.4v-9.6L69.5 51.3l-5-4.7-6.1-8-.8-8C57.6 19.8 55.8 9.3 50 2Z"/></svg></span>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
  }

  function popup(aircraft) {
    return `<div class="aircraft-popup"><strong>${escapeHtml(callsign(aircraft))}</strong><span>${escapeHtml(aircraft.hex)}</span><dl><div><dt>Altitude</dt><dd>${format(aircraft.altitude, " ft")}</dd></div><div><dt>Speed</dt><dd>${format(aircraft.groundSpeed, " kt")}</dd></div><div><dt>Heading</dt><dd>${format(aircraft.heading, "°")}</dd></div><div><dt>Last seen</dt><dd>${formatTime(aircraft.lastSeen)}</dd></div></dl></div>`;
  }

  function initMap() {
    map = window.L.map("live-map", { zoomControl: true, worldCopyJump: true }).setView([20, 0], 2);
    window.L.tileLayer("https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg", {
      minZoom: 2, maxZoom: 13,
      attribution: '&copy; <a href="https://s2maps.eu/" target="_blank" rel="noreferrer">Sentinel-2 cloudless</a> by EOX'
    }).addTo(map);
    map.createPane("place-labels");
    map.getPane("place-labels").style.zIndex = 450;
    map.getPane("place-labels").style.pointerEvents = "none";
    window.L.tileLayer("https://tiles.maps.eox.at/wmts/1.0.0/overlay_3857/default/g/{z}/{y}/{x}.jpg", {
      minZoom: 2, maxZoom: 18, pane: "place-labels",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>; labels by EOX'
    }).addTo(map);
    map.on("zoomend", updateAircraftLabels);
    map.on("moveend", () => {
      window.clearTimeout(viewportRefreshTimer);
      viewportRefreshTimer = window.setTimeout(refresh, 180);
    });
  }

  function updateAircraftLabels() {
    const showLabels = map.getZoom() >= labelZoom && markers.size <= labelLimit;
    markers.forEach((marker) => {
      if (showLabels && !marker.isTooltipOpen()) marker.openTooltip();
      if (!showLabels && marker.isTooltipOpen()) marker.closeTooltip();
    });
  }

  function renderMarkers(aircraft) {
    const liveHexes = new Set();
    aircraft.forEach((item) => {
      liveHexes.add(item.hex);
      const latLng = [item.latitude, item.longitude];
      let marker = markers.get(item.hex);
      if (!marker) {
        marker = window.L.marker(latLng, { icon: aircraftIcon(item), title: label(item), riseOnHover: true }).addTo(map);
        marker.bindTooltip(label(item), { direction: "top", offset: [0, -18], className: "aircraft-label", opacity: 0.95 });
        markers.set(item.hex, marker);
      } else {
        marker.setLatLng(latLng).setIcon(aircraftIcon(item));
        marker.setTooltipContent(label(item));
      }
      marker.bindPopup(popup(item));
    });
    markers.forEach((marker, hex) => { if (!liveHexes.has(hex)) { marker.remove(); markers.delete(hex); } });
    updateAircraftLabels();
    if (aircraft.length && $("#follow-latest").checked) map.panTo([aircraft[0].latitude, aircraft[0].longitude], { animate: true });
  }

  function fitAircraft(aircraft) {
    if (!aircraft.length) return;
    if (aircraft.length === 1) map.setView([aircraft[0].latitude, aircraft[0].longitude], 8);
    else map.fitBounds(aircraft.map((item) => [item.latitude, item.longitude]), { padding: [48, 48], maxZoom: 8 });
  }

  function renderList(aircraft) {
    $("#aircraft-count").textContent = aircraft.length.toLocaleString();
    $("#aircraft-list").innerHTML = aircraft.length ? aircraft.map((item) => `<button class="aircraft-row" type="button" data-hex="${escapeHtml(item.hex)}"><span class="row-icon">✈</span><span><strong>${escapeHtml(callsign(item))}</strong><small>${escapeHtml(item.hex)} · ${format(item.altitude, " ft")} · ${format(item.groundSpeed, " kt")}</small></span><span class="row-heading">${format(item.heading, "°")}</span></button>`).join("") : `<div class="empty-state"><span>⌁</span><strong>No positions yet</strong><p>The receiver is connected, but no ADS-B messages with coordinates have arrived.</p></div>`;
    $("#aircraft-list").querySelectorAll("[data-hex]").forEach((button) => button.addEventListener("click", () => {
      const marker = markers.get(button.dataset.hex);
      if (marker) { map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 9)); marker.openPopup(); }
    }));
  }

  function setStatus(connection, failed = false) {
    const status = $("#feed-status");
    status.className = `feed-status${connection?.connected && !failed ? " connected" : failed ? " error" : ""}`;
    status.innerHTML = `<span></span>${failed ? " Feed unavailable" : connection?.connected ? " ADSBHub TCP connected" : " Reconnecting to ADSBHub"}`;
  }

  async function refresh() {
    if (refreshInFlight) return;
    refreshInFlight = true;
    try {
      const query = new URLSearchParams({ limit: String(maximumAircraft) });
      // The first load intentionally has no viewport filter. This makes the
      // map useful even when the feed has no aircraft near the default view.
      if (hasLoadedInitialFeed) {
        const bounds = map.getBounds();
        query.set("bbox", [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].map((value) => value.toFixed(5)).join(","));
      }
      const response = await fetch(`${endpoint}?${query}`, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const payload = await response.json();
      if (!payload.status || !Array.isArray(payload.aircraft)) throw new Error("Unexpected live-feed payload");
      const isInitialLoad = !hasLoadedInitialFeed;
      hasLoadedInitialFeed = true;
      lastAircraft = payload.aircraft;
      renderMarkers(payload.aircraft);
      renderList(payload.aircraft);
      if (isInitialLoad && payload.aircraft.length) fitAircraft(payload.aircraft);
      setStatus(payload.connection);
      $("#updated-at").textContent = `Updated ${formatTime(payload.updatedAt)}`;
      $("#map-note").textContent = payload.aircraft.length ? `Showing ${payload.aircraft.length}${payload.truncated ? "+" : ""} current positions in this map view. Zoom in to show aircraft labels.` : "Waiting for a position from ADSBHub in this map view.";
    } catch (error) {
      setStatus(null, true);
      $("#updated-at").textContent = "Update failed";
      $("#map-note").textContent = "The live-map API could not be reached. The page will retry automatically.";
    } finally {
      refreshInFlight = false;
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    initMap();
    $("#fit-aircraft").addEventListener("click", () => fitAircraft(lastAircraft));
    const menuButton = $("#map-menu-button"); const navLinks = $("#map-nav-links");
    menuButton.addEventListener("click", () => { const open = navLinks.classList.toggle("open"); menuButton.setAttribute("aria-expanded", String(open)); menuButton.textContent = open ? "×" : "☰"; });
    refresh();
    window.setInterval(refresh, refreshInterval);
  });
})();
