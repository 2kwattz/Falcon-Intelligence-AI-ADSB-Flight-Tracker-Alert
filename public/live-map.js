(() => {
  const endpoint = "/live-map/aircrafts";
  const bookmarkEndpoint = "/api/aircraft/nearby";
  // The TCP receiver is already in memory, so a one-second UI snapshot keeps
  // positions responsive without opening additional feed connections.
  const refreshInterval = 1000;
  const bookmarkRefreshInterval = 5000;
  const maximumAircraft = 250;
  const maximumNoPositionAircraft = 120;
  const bookmarkRadiusNm = 100;
  const labelZoom = 2;
  const labelLimit = maximumAircraft;
  const markerMoveDuration = 900;
  const deadReckonMaxSeconds = 8;
  const earthRadiusNm = 3440.065;
  const defaultMapType = "satellite";
  const defaultFeedSource = "adsbhub-tcp";
  const feedSourceLabels = {
    "adsbhub-tcp": "ADSBHub TCP",
    "vadodara-station": "Vadodara Station"
  };
  const mapLayerConfigs = {
    satellite: {
      url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
      options: {
        minZoom: 2,
        maxZoom: 13,
        attribution: '&copy; <a href="https://s2maps.eu/" target="_blank" rel="noreferrer">Sentinel-2 cloudless</a> by EOX'
      }
    },
    osm: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      options: {
        minZoom: 2,
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
      }
    },
    hot: {
      url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      options: {
        minZoom: 2,
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, Tiles courtesy of HOT'
      }
    },
    opentopo: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      options: {
        minZoom: 2,
        maxZoom: 17,
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, SRTM | Map style: &copy; OpenTopoMap'
      }
    },
    cyclosm: {
      url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
      options: {
        minZoom: 2,
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, CyclOSM'
      }
    }
  };
  const airspaceBookmarks = [
    { id: "bhuj", latitude: 23.241999, longitude: 69.666932 },
    { id: "vadodara", latitude: 22.3072, longitude: 73.1812 },
    { id: "lucknow", latitude: 26.8467, longitude: 80.9462 },
    { id: "delhi", latitude: 28.6139, longitude: 77.2090 },
    { id: "bengaluru", latitude: 12.9716, longitude: 77.5946 }
  ];

  const $ = (selector) => document.querySelector(selector);
  const markers = new Map();
  const markerStates = new Map();
  const baseLayers = new Map();
  let map;
  let activeBaseLayer = null;
  let placeLabelLayer = null;
  let lastAircraft = [];
  let refreshInFlight = false;
  let viewportRefreshTimer;
  let hasLoadedInitialFeed = false;
  let bookmarkRefreshInFlight = false;
  let markerAnimationFrame = null;
  let selectedFeedSource = defaultFeedSource;

  const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
  const text = (value, fallback = "-") => value === undefined || value === null || String(value).trim() === "" ? fallback : String(value).trim();
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  const format = (value, suffix = "") => {
    const number = finite(value);
    return number === null ? "-" : `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(number)}${suffix}`;
  };
  const formatTime = (value) => value ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value)) : "-";
  const callsign = (aircraft) => text(aircraft.callsign, aircraft.hex);
  const label = (aircraft) => `${callsign(aircraft)} - ${aircraft.hex}`;

  function projectPosition(latitude, longitude, bearingDegrees, distanceNm) {
    const angularDistance = distanceNm / earthRadiusNm;
    const bearing = bearingDegrees * Math.PI / 180;
    const lat1 = latitude * Math.PI / 180;
    const lon1 = longitude * Math.PI / 180;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing));
    const lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1), Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2));

    return [lat2 * 180 / Math.PI, ((lon2 * 180 / Math.PI + 540) % 360) - 180];
  }

  function positionAgeSeconds(aircraft) {
    const positionTime = finite(aircraft.positionSeen) ?? finite(aircraft.lastSeen);

    return positionTime === null ? null : Math.max(0, (Date.now() - positionTime) / 1000);
  }

  function canDeadReckon(aircraft) {
    const age = positionAgeSeconds(aircraft);
    const speed = finite(aircraft.groundSpeed);
    const heading = finite(aircraft.heading);

    return age !== null &&
      age <= deadReckonMaxSeconds &&
      speed !== null &&
      speed > 0 &&
      heading !== null &&
      finite(aircraft.latitude) !== null &&
      finite(aircraft.longitude) !== null;
  }

  function liveLatLng(aircraft) {
    const latitude = finite(aircraft.latitude);
    const longitude = finite(aircraft.longitude);

    if (latitude === null || longitude === null) return null;
    if (!canDeadReckon(aircraft)) return [latitude, longitude];

    const age = Math.min(positionAgeSeconds(aircraft), deadReckonMaxSeconds);
    const distanceNm = finite(aircraft.groundSpeed) * age / 3600;

    return projectPosition(latitude, longitude, finite(aircraft.heading), distanceNm);
  }

  function animateMarkers(now) {
    let keepAnimating = false;

    markerStates.forEach((state, hex) => {
      const target = liveLatLng(state.aircraft) || state.to;
      const progress = Math.min(1, (now - state.start) / state.duration);
      const nextLat = state.from[0] + (target[0] - state.from[0]) * progress;
      const nextLon = state.from[1] + (target[1] - state.from[1]) * progress;

      state.marker.setLatLng([nextLat, nextLon]);

      if (progress < 1 || canDeadReckon(state.aircraft)) {
        keepAnimating = true;
      } else {
        markerStates.delete(hex);
      }
    });

    markerAnimationFrame = keepAnimating ? window.requestAnimationFrame(animateMarkers) : null;
  }

  function moveMarker(hex, marker, aircraft) {
    const target = liveLatLng(aircraft);

    if (!target) return;

    const current = marker.getLatLng();
    markerStates.set(hex, {
      marker,
      aircraft,
      from: [current.lat, current.lng],
      to: target,
      start: performance.now(),
      duration: markerMoveDuration
    });

    if (!markerAnimationFrame) {
      markerAnimationFrame = window.requestAnimationFrame(animateMarkers);
    }
  }

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
    const sourceName = text(aircraft.stationName, feedSourceLabels[aircraft.source] || "Live feed");
    return `<div class="aircraft-popup"><strong>${escapeHtml(callsign(aircraft))}</strong><span>${escapeHtml(aircraft.hex)}</span><dl><div><dt>Source</dt><dd>${escapeHtml(sourceName)}</dd></div><div><dt>Altitude</dt><dd>${format(aircraft.altitude, " ft")}</dd></div><div><dt>Speed</dt><dd>${format(aircraft.groundSpeed, " kt")}</dd></div><div><dt>Heading</dt><dd>${format(aircraft.heading, " deg")}</dd></div><div><dt>Last seen</dt><dd>${formatTime(aircraft.lastSeen)}</dd></div></dl></div>`;
  }

  function setMapType(type) {
    const selectedType = mapLayerConfigs[type] ? type : defaultMapType;
    const nextLayer = baseLayers.get(selectedType);

    if (!nextLayer || nextLayer === activeBaseLayer) return;

    if (activeBaseLayer) activeBaseLayer.remove();
    activeBaseLayer = nextLayer.addTo(map);

    if (placeLabelLayer) {
      if (selectedType === "satellite" && !map.hasLayer(placeLabelLayer)) {
        placeLabelLayer.addTo(map);
      } else if (selectedType !== "satellite" && map.hasLayer(placeLabelLayer)) {
        placeLabelLayer.remove();
      }
    }

    const select = $("#map-type");
    if (select) select.value = selectedType;
  }

  function initMap() {
    map = window.L.map("live-map", { zoomControl: true, worldCopyJump: true }).setView([20, 0], 2);
    Object.entries(mapLayerConfigs).forEach(([type, config]) => {
      baseLayers.set(type, window.L.tileLayer(config.url, config.options));
    });
    map.createPane("place-labels");
    map.getPane("place-labels").style.zIndex = 450;
    map.getPane("place-labels").style.pointerEvents = "none";
    placeLabelLayer = window.L.tileLayer("https://tiles.maps.eox.at/wmts/1.0.0/overlay_3857/default/g/{z}/{y}/{x}.jpg", {
      minZoom: 2,
      maxZoom: 18,
      pane: "place-labels",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>; labels by EOX'
    });
    setMapType(defaultMapType);
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
        marker = window.L.marker(liveLatLng(item) || latLng, { icon: aircraftIcon(item), title: label(item), riseOnHover: true }).addTo(map);
        marker.bindTooltip(label(item), { direction: "top", offset: [0, -18], className: "aircraft-label", opacity: 0.95 });
        markers.set(item.hex, marker);
      } else {
        marker.setIcon(aircraftIcon(item));
        marker.setTooltipContent(label(item));
        moveMarker(item.hex, marker, item);
      }
      marker.bindPopup(popup(item));
    });
    markers.forEach((marker, hex) => {
      if (!liveHexes.has(hex)) {
        markerStates.delete(hex);
        marker.remove();
        markers.delete(hex);
      }
    });
    updateAircraftLabels();
    if (aircraft.length && $("#follow-latest").checked) {
      const latest = liveLatLng(aircraft[0]) || [aircraft[0].latitude, aircraft[0].longitude];
      map.panTo(latest, { animate: true });
    }
  }

  function fitAircraft(aircraft) {
    if (!aircraft.length) return;
    if (aircraft.length === 1) {
      map.setView(liveLatLng(aircraft[0]) || [aircraft[0].latitude, aircraft[0].longitude], 8);
      return;
    }
    map.fitBounds(aircraft.map((item) => liveLatLng(item) || [item.latitude, item.longitude]), { padding: [48, 48], maxZoom: 8 });
  }

  function renderPositionList(aircraft) {
    $("#aircraft-count").textContent = aircraft.length.toLocaleString();
    $("#aircraft-list").innerHTML = aircraft.length ? aircraft.map((item) => `<button class="aircraft-row" type="button" data-hex="${escapeHtml(item.hex)}"><span class="row-icon">AC</span><span><strong>${escapeHtml(callsign(item))}</strong><small>${escapeHtml(item.hex)} - ${format(item.altitude, " ft")} - ${format(item.groundSpeed, " kt")}</small></span><span class="row-heading">${format(item.heading, " deg")}</span></button>`).join("") : `<div class="empty-state"><span>AC</span><strong>No positions yet</strong><p>The receiver is connected, but no ADS-B messages with coordinates have arrived in this map view.</p></div>`;
    $("#aircraft-list").querySelectorAll("[data-hex]").forEach((button) => button.addEventListener("click", () => {
      const marker = markers.get(button.dataset.hex);
      if (marker) {
        map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 9));
        marker.openPopup();
      }
    }));
  }

  function renderNoPositionList(aircraft, totalWithoutPosition, truncated) {
    $("#no-position-count").textContent = Number(totalWithoutPosition || aircraft.length).toLocaleString();
    $("#no-position-list").innerHTML = aircraft.length ? aircraft.map((item) => `<div class="no-position-row"><span><strong>${escapeHtml(callsign(item))}</strong><small>${escapeHtml(item.hex)}</small></span><span>${format(item.altitude, " ft")}</span><span>${format(item.groundSpeed, " kt")}</span><span>${format(item.heading, " deg")}</span><span>${formatTime(item.lastSeen)}</span></div>`).join("") + (truncated ? `<div class="empty-state"><strong>List limited</strong><p>More aircraft without coordinates are active in the receiver.</p></div>` : "") : `<div class="empty-state"><span>OK</span><strong>All visible aircraft have coordinates</strong><p>Aircraft without latitude and longitude will appear here as soon as the receiver sees them.</p></div>`;
  }

  function setStatus(connection, failed = false, feed) {
    const status = $("#feed-status");
    const feedName = feed?.label || connection?.stationName || feedSourceLabels[selectedFeedSource] || "Live feed";
    const awaitingData = connection?.state === "connected-awaiting-data" || (connection?.connected && !connection?.lastMessageAt);
    status.className = `feed-status${connection?.connected && !failed && !awaitingData ? " connected" : failed ? " error" : ""}`;
    status.title = connection?.warning || "";
    status.innerHTML = `<span></span>${failed ? ` ${escapeHtml(feedName)} unavailable` : awaitingData ? ` ${escapeHtml(feedName)} waiting for data` : connection?.connected ? ` ${escapeHtml(feedName)} connected` : ` Reconnecting to ${escapeHtml(feedName)}`}`;
  }

  function setPanelOpen(panelId, buttonId, open) {
    const panel = $("#" + panelId);
    const button = $("#" + buttonId);
    if (!panel || !button) return;

    panel.classList.toggle("is-open", open);
    button.classList.toggle("is-active", open);
    button.setAttribute("aria-expanded", String(open));
  }

  function togglePanel(panelId, buttonId) {
    const panel = $("#" + panelId);
    setPanelOpen(panelId, buttonId, !panel.classList.contains("is-open"));
  }

  function setMapOverlayCollapsed(collapsed) {
    const hud = $("#map-hud");
    const button = $("#toggle-map-overlay");
    if (!hud || !button) return;

    const label = collapsed ? "Show map controls" : "Hide map controls";
    hud.classList.toggle("is-collapsed", collapsed);
    button.classList.toggle("is-active", collapsed);
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", label);
    button.title = label;

    Array.from(hud.children).forEach((child) => {
      if (child === button) return;
      child.setAttribute("aria-hidden", String(collapsed));
      child.querySelectorAll("button, input, select").forEach((control) => {
        control.disabled = collapsed;
      });
    });
  }

  function toggleMapOverlay() {
    const hud = $("#map-hud");
    if (!hud) return;
    setMapOverlayCollapsed(!hud.classList.contains("is-collapsed"));
  }

  function clearLiveFeed() {
    if (markerAnimationFrame) {
      window.cancelAnimationFrame(markerAnimationFrame);
      markerAnimationFrame = null;
    }

    markerStates.clear();
    markers.forEach((marker) => marker.remove());
    markers.clear();
    lastAircraft = [];
    hasLoadedInitialFeed = false;
    $("#aircraft-count").textContent = "0";
    $("#no-position-count").textContent = "0";
    $("#aircraft-list").innerHTML = `<div class="empty-state"><span>AC</span><strong>Loading feed</strong><p>Connecting to ${escapeHtml(feedSourceLabels[selectedFeedSource] || "the selected station")}.</p></div>`;
    $("#no-position-list").innerHTML = "";
    $("#map-note").textContent = `Switching to ${feedSourceLabels[selectedFeedSource] || "selected feed"}...`;
  }

  function setFeedSource(source) {
    selectedFeedSource = feedSourceLabels[source] ? source : defaultFeedSource;
    const select = $("#feed-source");
    if (select) select.value = selectedFeedSource;
    clearLiveFeed();
    refresh();
    refreshBookmarks();
  }

  async function refresh() {
    if (refreshInFlight) return;
    refreshInFlight = true;
    const requestedSource = selectedFeedSource;
    try {
      const query = new URLSearchParams({
        source: requestedSource,
        limit: String(maximumAircraft),
        noPositionLimit: String(maximumNoPositionAircraft)
      });
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
      if (requestedSource !== selectedFeedSource) return;
      const isInitialLoad = !hasLoadedInitialFeed;
      const noPositionAircraft = Array.isArray(payload.noPositionAircraft) ? payload.noPositionAircraft : [];
      const feedName = payload.feed?.label || feedSourceLabels[selectedFeedSource] || "Selected feed";
      hasLoadedInitialFeed = true;
      lastAircraft = payload.aircraft;
      renderMarkers(payload.aircraft);
      renderPositionList(payload.aircraft);
      renderNoPositionList(noPositionAircraft, payload.totalWithoutPosition, payload.noPositionTruncated);
      if (isInitialLoad && payload.aircraft.length) fitAircraft(payload.aircraft);
      setStatus(payload.connection, false, payload.feed);
      $("#updated-at").textContent = `Updated ${formatTime(payload.updatedAt)}`;
      $("#map-note").textContent = payload.aircraft.length
        ? `${feedName}: showing ${payload.aircraft.length}${payload.truncated ? "+" : ""} positioned aircraft in this map view. ${Number(payload.totalWithoutPosition || 0).toLocaleString()} aircraft are listed without coordinates.`
        : `${feedName}: waiting for coordinates in this map view. ${Number(payload.totalWithoutPosition || 0).toLocaleString()} aircraft are currently listed without coordinates.`;
    } catch (error) {
      setStatus(null, true);
      $("#updated-at").textContent = "Update failed";
      $("#map-note").textContent = "The live-map API could not be reached. The page will retry automatically.";
    } finally {
      refreshInFlight = false;
    }
  }

  function renderBookmark(bookmark, payload, failed = false) {
    const card = document.querySelector("[data-bookmark=\"" + bookmark.id + "\"]");
    if (!card) return;

    const count = card.querySelector("[data-bookmark-count]");
    const detail = card.querySelector("[data-bookmark-detail]");
    const status = card.querySelector("[data-bookmark-status]");
    const updated = card.querySelector("[data-bookmark-updated]");
    const nearest = payload?.aircraft?.[0];
    card.classList.toggle("bookmark-error", failed);
    card.classList.toggle("bookmark-ready", !failed);

    if (failed) {
      count.textContent = "-";
      detail.textContent = "Unable to reach the live proximity API.";
      status.innerHTML = "<i></i> Retry pending";
      updated.textContent = "-";
      return;
    }

    count.textContent = Number(payload.totalInRadius || 0).toLocaleString();
    detail.textContent = nearest
      ? "Nearest: " + callsign(nearest) + " - " + format(nearest.distanceNm, " NM")
      : "No aircraft with a current position in range.";
    status.innerHTML = "<i></i> Live";
    updated.textContent = "Updated " + formatTime(payload.updatedAt);
  }

  async function refreshBookmarks() {
    if (bookmarkRefreshInFlight) return;
    bookmarkRefreshInFlight = true;
    const requestedSource = selectedFeedSource;

    await Promise.all(airspaceBookmarks.map(async (bookmark) => {
      const card = document.querySelector("[data-bookmark=\"" + bookmark.id + "\"]");
      card?.classList.add("bookmark-loading");
      try {
        const query = new URLSearchParams({
          source: requestedSource,
          latitude: String(bookmark.latitude),
          longitude: String(bookmark.longitude),
          radiusNm: String(bookmarkRadiusNm),
          limit: "1"
        });
        const response = await fetch(bookmarkEndpoint + "?" + query, { headers: { Accept: "application/json" }, cache: "no-store" });
        if (!response.ok) throw new Error("Server returned " + response.status);
        const payload = await response.json();
        if (!payload.status || !Array.isArray(payload.aircraft)) throw new Error("Unexpected nearby-aircraft payload");
        if (requestedSource !== selectedFeedSource) return;
        renderBookmark(bookmark, payload);
      } catch (error) {
        if (requestedSource !== selectedFeedSource) return;
        renderBookmark(bookmark, null, true);
      } finally {
        card?.classList.remove("bookmark-loading");
      }
    }));

    bookmarkRefreshInFlight = false;
    if (requestedSource !== selectedFeedSource) refreshBookmarks();
  }

  function focusBookmark(bookmark) {
    map.flyTo([bookmark.latitude, bookmark.longitude], 7, { animate: true, duration: 0.8 });
  }

  window.addEventListener("DOMContentLoaded", () => {
    initMap();
    $("#map-type").addEventListener("change", (event) => setMapType(event.target.value));
    $("#feed-source").addEventListener("change", (event) => setFeedSource(event.target.value));
    $("#fit-aircraft").addEventListener("click", () => fitAircraft(lastAircraft));
    $("#toggle-aircraft-panel").addEventListener("click", () => togglePanel("aircraft-panel", "toggle-aircraft-panel"));
    $("#toggle-no-position-panel").addEventListener("click", () => togglePanel("no-position-panel", "toggle-no-position-panel"));
    $("#toggle-bookmark-panel").addEventListener("click", () => togglePanel("bookmark-panel", "toggle-bookmark-panel"));
    $("#toggle-map-overlay").addEventListener("click", toggleMapOverlay);

    const menuButton = $("#map-menu-button");
    const navLinks = $("#map-nav-links");
    menuButton.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.textContent = open ? "Close" : "Menu";
    });

    document.querySelectorAll("[data-focus-bookmark]").forEach((button) => {
      button.addEventListener("click", () => {
        const bookmark = airspaceBookmarks.find((item) => item.id === button.dataset.focusBookmark);
        if (bookmark) focusBookmark(bookmark);
      });
    });

    refresh();
    refreshBookmarks();
    window.setInterval(refresh, refreshInterval);
    window.setInterval(refreshBookmarks, bookmarkRefreshInterval);
  });
})();
