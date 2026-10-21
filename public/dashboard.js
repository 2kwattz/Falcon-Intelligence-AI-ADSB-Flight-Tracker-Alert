(() => {
  const $ = (selector) => document.querySelector(selector);
  const status = $("#dashboard-status");
  const summaryGrid = $("#summary-grid");
  const stationGrid = $("#station-grid");
  const receivingFeedGrid = $("#receiving-feed-grid");
  const feedingFeedGrid = $("#feeding-feed-grid");
  const healthGrid = $("#health-grid");
  const phoneGrid = $("#phone-grid");
  const cityAlertRadiiForm = $("#city-alert-radii-form");
  const cityAlertRadiiNote = $("#city-alert-radii-note");
  const cityAlertRadiiSaveButton = $("#city-alert-radii-save");
  const cityAlertEnabledForm = $("#city-alert-enabled-form");
  const cityAlertEnabledNote = $("#city-alert-enabled-note");
  const cityAlertEnabledSaveButton = $("#city-alert-enabled-save");
  const cityAlertRecipientsGrid = $("#city-alert-recipients-grid");
  const cityAlertRecipientForm = $("#city-alert-recipient-form");
  const cityAlertRecipientNote = $("#city-alert-recipient-note");
  const cityAlertRecipientAddButton = $("#city-alert-recipient-add");
  const adsbReceiverSummary = $("#adsb-receiver-summary");
  const adsbHealthOverview = $("#adsb-health-overview");
  const adsbMetricsGrid = $("#adsb-metrics-grid");
  const adsbHealthGuide = $("#adsb-health-guide");
  const adsbLogSource = $("#adsb-log-source");
  const adsbLogOutput = $("#adsb-log-output");
  const gainControlForm = $("#gain-control-form");
  const gainModeAutomatic = $("#gain-mode-automatic");
  const gainModeManual = $("#gain-mode-manual");
  const gainManualInput = $("#gain-value");
  const gainControlSubmit = $("#gain-control-submit");
  const gainControlStatus = $("#gain-control-status");
  const graphs1090Status = $("#graphs1090-status");
  const graphs1090Grid = $("#graphs1090-grid");
  const refreshButton = $("#refresh-button");
  const overviewPanel = $("#dashboard-overview");
  const serverHealthPanel = $("#server-health-panel");
  const sdrHealthPanel = $("#sdr-health-panel");
  const feedClientsPanel = $("#feed-clients-panel");
  const visitorLogsPanel = $("#visitor-logs-panel");
  const visitorLogsGrid = $("#visitor-log-grid");
  const visitorLogsSummary = $("#visitor-log-summary");
  const visitorLogsNote = $("#visitor-log-note");
  const visitorLoggingToggle = $("#visitor-log-enabled");
  const dashboardTabs = document.querySelectorAll("[data-dashboard-tab]");
  const dashboardPanels = {
    overview: overviewPanel,
    "server-health": serverHealthPanel,
    "sdr-health": sdrHealthPanel,
    "feed-clients": feedClientsPanel,
    "flight-alerts": $("#flight-alerts-panel"),
    "visitor-logs": visitorLogsPanel
  };
  let activeDashboardTab = "overview";
  let latestGraphs1090 = null;
  let visitorLogsLoaded = false;
  let visitorLogsLoading = false;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
  })[character]);

  const formatNumber = (value) => Number(value || 0).toLocaleString();

  const formatBytes = (value) => {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes < 0) return "Unavailable";
    if (bytes < 1024) return `${bytes} B`;

    const units = ["KB", "MB", "GB", "TB"];
    let unitIndex = -1;
    let formatted = bytes;
    do {
      formatted /= 1024;
      unitIndex += 1;
    } while (formatted >= 1024 && unitIndex < units.length - 1);
    return `${formatted.toFixed(formatted >= 10 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const formatDecimal = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) : "Unavailable";
  };

  const formatPercent = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(number % 1 ? 1 : 0)}%` : "Unavailable";
  };

  const formatMetricNumber = (value) => {
    if (value === null || value === undefined || value === "") return "Unavailable";
    const number = Number(value);
    return Number.isFinite(number) ? formatNumber(number) : "Unavailable";
  };

  const formatUptime = (seconds) => {
    const total = Number(seconds || 0);
    const days = Math.floor(total / 86_400);
    const hours = Math.floor((total % 86_400) / 3_600);
    const minutes = Math.floor((total % 3_600) / 60);
    return days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const greetingForLocalTime = (date = new Date()) => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const dashboardGreeting = (user) => {
    const name = String(user?.firstName || user?.username || "").trim();
    return name ? `${greetingForLocalTime()}, ${name}` : greetingForLocalTime();
  };

  const formatDateTime = (value) => {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return "No recent data";
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
  };

  const stateClass = (state, connected) => {
    if (connected || ["receiving", "connected", "active"].includes(String(state).toLowerCase())) return "good";
    if (["unavailable", "disconnected", "not-detected"].includes(String(state).toLowerCase())) return "bad";
    return "warning";
  };

  const setStatus = (message = "", isError = false) => {
    status.textContent = message;
    status.classList.toggle("error", isError);
  };

  const summaryCard = (title, value, detail) => `<article class="summary-card"><span>${escapeHtml(title)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(detail)}</p></article>`;

  const healthCard = (title, value, detail, usage) => {
    const usageValue = Number(usage);
    const boundedUsage = Math.max(0, Math.min(100, usageValue));
    const meter = Number.isFinite(usageValue)
      ? `<div class="health-meter" aria-label="${escapeHtml(title)} level ${escapeHtml(formatPercent(usageValue))}"><span style="--usage:${boundedUsage}%"></span></div>`
      : "";
    return `<article class="health-card"><span>${escapeHtml(title)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(detail)}</p>${meter}</article>`;
  };

  const statsCard = (entry, kind, metric) => {
    const state = entry.state || "unknown";
    const displayMetric = metric || `${formatNumber(entry.aircraftCount)} aircraft`;
    return `<article class="${kind}-card"><div class="card-header"><h3>${escapeHtml(entry.name)}</h3><span class="state ${stateClass(state, entry.connected)}">${escapeHtml(state)}</span></div><p class="metric">${escapeHtml(displayMetric)}</p><p class="card-detail">${escapeHtml(entry.detail || "No additional feed detail")}</p><div class="card-meta"><span>${escapeHtml(entry.source || entry.id || "Feed")}</span><span>${escapeHtml(formatDateTime(entry.lastMessageAt))}</span></div></article>`;
  };

  const adsbMetricCard = (label, value, detail) => `<article class="adsb-metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(detail)}</p></article>`;

  const selectedGainMode = () => gainModeAutomatic.checked ? "automatic" : "manual";

  const setGainControlMode = () => {
    const automatic = selectedGainMode() === "automatic";
    gainManualInput.disabled = automatic;
    gainManualInput.required = !automatic;
  };

  const syncGainControl = (receiver = {}) => {
    const gainConfiguration = receiver.gainConfiguration || {};
    const configuredGain = gainConfiguration.configuredGainDb === null || gainConfiguration.configuredGainDb === undefined
      ? NaN
      : Number(gainConfiguration.configuredGainDb);

    gainModeAutomatic.checked = gainConfiguration.mode === "automatic";
    gainModeManual.checked = gainConfiguration.mode !== "automatic";
    if (gainConfiguration.mode === "manual" && Number.isFinite(configuredGain)) {
      gainManualInput.value = String(configuredGain);
    }
    setGainControlMode();
  };

  const renderAdsbReceiver = (receiver = {}) => {
    const health = receiver.health || {};
    const criteria = health.criteria || {};
    const healthState = health.state || "warning";
    const healthLabel = health.label || "Receiver status unavailable";
    const messageAge = health.messageAgeSeconds === null || health.messageAgeSeconds === undefined ? NaN : Number(health.messageAgeSeconds);
    const log = receiver.log || {};
    const logLines = Array.isArray(log.lines) ? log.lines : [];
    const badRate = receiver.badMessageRate === null || receiver.badMessageRate === undefined ? NaN : Number(receiver.badMessageRate);
    const gain = receiver.gainDb === null || receiver.gainDb === undefined ? NaN : Number(receiver.gainDb);
    const gainConfiguration = receiver.gainConfiguration || {};
    const configuredGain = gainConfiguration.configuredGainDb === null || gainConfiguration.configuredGainDb === undefined
      ? NaN
      : Number(gainConfiguration.configuredGainDb);
    const gainMode = gainConfiguration.mode || "unknown";
    const gainModeValue = gainMode === "automatic"
      ? "Automatic"
      : gainMode === "manual"
        ? "Manual"
        : "Unknown";
    const gainModeDetail = gainMode === "automatic"
      ? "readsb was started with automatic gain control."
      : gainMode === "manual"
        ? Number.isFinite(configuredGain)
          ? `readsb was started with --gain ${configuredGain.toFixed(configuredGain % 1 ? 1 : 0)}.`
          : "readsb has a non-automatic gain setting."
        : "The readsb launch setting could not be confirmed.";
    const observedGainValue = Number.isFinite(gain) ? `${gain.toFixed(gain % 1 ? 1 : 0)} dB` : "Unavailable";

    adsbReceiverSummary.textContent = health.detail || "The local ADS-B receiver could not be inspected.";
    adsbHealthOverview.innerHTML = `<div class="adsb-health-state ${escapeHtml(healthState)}"><span class="state ${escapeHtml(healthState === "healthy" ? "good" : healthState === "unhealthy" ? "bad" : "warning")}">${escapeHtml(healthLabel)}</span><strong>${escapeHtml(receiver.stationName || "Local receiver")}</strong><p>${escapeHtml(health.detail || "No health assessment is available.")}</p></div>`;
    adsbMetricsGrid.innerHTML = [
      adsbMetricCard("Gain mode", gainModeValue, gainModeDetail),
      adsbMetricCard("Current gain", observedGainValue, Number.isFinite(gain) ? "Live gain reported by readsb in stats.json." : "readsb is not reporting a live gain value."),
      adsbMetricCard("Received messages", formatMetricNumber(receiver.receivedMessages), receiver.statsAvailable ? "Decoder messages in the latest one-minute statistics window." : "stats.json is unavailable."),
      adsbMetricCard("Bad messages", formatMetricNumber(receiver.badMessages), Number.isFinite(badRate) ? `${formatPercent(badRate)} of ${receiver.badMessageRateBasis || "decoder frames"}.` : "Bad-message rate is unavailable."),
      adsbMetricCard("Last aircraft update", Number.isFinite(messageAge) ? `${messageAge}s ago` : "Unavailable", Number.isFinite(messageAge) ? `${formatMetricNumber(receiver.aircraftCount)} aircraft currently visible.` : "No current aircraft timestamp is available.")
    ].join("");
    syncGainControl(receiver);
    adsbHealthGuide.innerHTML = `<h3>What healthy reception means</h3><p>Healthy means an aircraft update arrived within <strong>${escapeHtml(formatMetricNumber(criteria.maximumMessageAgeSeconds))} seconds</strong>, readsb decoded at least <strong>${escapeHtml(formatMetricNumber(criteria.minimumMessagesPerMinute))} message${Number(criteria.minimumMessagesPerMinute) === 1 ? "" : "s"} in the latest minute</strong>, and bad decoder frames are at or below <strong>${escapeHtml(formatPercent(criteria.maximumBadMessageRate))}</strong> of detected Mode-S frames. These thresholds can be adjusted on the server with the <code>READSB_HEALTHY_MESSAGE_RATE</code>, <code>READSB_MAX_BAD_MESSAGE_RATE</code>, and <code>READSB_FRESH_MESSAGE_SECONDS</code> environment variables.</p>`;
    adsbLogSource.textContent = log.available ? (log.source || "readsb log") : "Log unavailable";
    adsbLogOutput.textContent = logLines.length
      ? logLines.join("\n")
      : "No readsb log entries are available. Configure READSB_LOG_PATH or ensure the readsb systemd service writes to journald.";
  };

  const renderGraphs1090 = (graphs1090 = {}) => {
    const graphs = Array.isArray(graphs1090.graphs) ? graphs1090.graphs : [];
    const period = graphs1090.period || "selected";

    if (!graphs1090.available) {
      graphs1090Status.textContent = "Graphs1090 output is unavailable on this server.";
      graphs1090Grid.innerHTML = '<p class="empty-state">No Graphs1090 statistics could be read from the local output directory.</p>';
      return;
    }

    graphs1090Status.textContent = graphs.length
      ? `${formatNumber(graphs.length)} Graphs1090 ${period} statistic${graphs.length === 1 ? "" : "s"}. Select a graph to open it at full size.`
      : `No ${period} Graphs1090 statistics are currently available.`;
    graphs1090Grid.innerHTML = graphs.map((graph) => {
      const imageUrl = `/api/dashboard/graphs1090/${encodeURIComponent(graph.fileName)}?updated=${encodeURIComponent(graph.updatedAt || "")}`;
      return `<article class="graphs1090-card"><a href="${escapeHtml(imageUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(`${graph.label || "Graphs1090"} graph for the last ${period}`)}" loading="lazy"></a><div><h3>${escapeHtml(graph.label || "Graphs1090 statistic")}</h3><span>Updated ${escapeHtml(formatDateTime(graph.updatedAt))}</span></div></article>`;
    }).join("") || '<p class="empty-state">No Graphs1090 graph images are available for this period.</p>';
  };

  const visitorLogCard = (visitor) => {
    const pages = Array.isArray(visitor.pages) ? visitor.pages : [];
    const pageList = pages.length
      ? pages.map((page) => `<li>${escapeHtml(page)}</li>`).join("")
      : "<li>No public page recorded</li>";

    return `<article class="visitor-log-card"><div class="card-header"><h3>${escapeHtml(visitor.ip || "Unknown IP")}</h3><span class="state good">Anonymous</span></div><dl class="visitor-details"><div><dt>Browser</dt><dd>${escapeHtml(visitor.browser || "Unknown")}</dd></div><div><dt>Device</dt><dd>${escapeHtml(visitor.device || "Unknown")}</dd></div><div><dt>OS</dt><dd>${escapeHtml(visitor.operatingSystem || "Unknown")}</dd></div><div><dt>First seen</dt><dd>${escapeHtml(formatDateTime(visitor.firstSeen))}</dd></div><div><dt>Last new page</dt><dd>${escapeHtml(formatDateTime(visitor.lastSeen))}</dd></div></dl><div class="visitor-pages"><span>Unique public pages</span><ul>${pageList}</ul></div></article>`;
  };

  const renderVisitorLogs = (payload) => {
    const visitorLogs = payload.visitorLogs || {};
    const visitors = Array.isArray(visitorLogs.visitors) ? visitorLogs.visitors : [];
    const available = Boolean(visitorLogs.available);
    const enabled = visitorLogs.enabled !== false;

    visitorLoggingToggle.checked = enabled;
    visitorLoggingToggle.disabled = !available;
    visitorLogsNote.textContent = !available
      ? "Redis is unavailable, so visitor logging and stored records cannot be accessed."
      : enabled
        ? "Collection is active. Turning it off preserves existing records until they expire."
        : "Collection is paused. Existing records will expire automatically after 24 hours.";
    visitorLogsSummary.textContent = available
      ? `${formatNumber(visitorLogs.totalVisitors)} unique anonymous IP address${Number(visitorLogs.totalVisitors) === 1 ? "" : "es"} in the last ${visitorLogs.retentionHours || 24} hours. Showing ${formatNumber(visitors.length)} most recent record${visitors.length === 1 ? "" : "s"}. Each visitor is limited to ${formatNumber(visitorLogs.maxPagesPerVisitor || 0)} unique public pages.`
      : "Visitor logs are currently unavailable because Redis is disconnected.";
    visitorLogsGrid.innerHTML = visitors.map(visitorLogCard).join("")
      || '<p class="empty-state">No anonymous visitor records are currently stored.</p>';
  };

  const renderDashboard = (data) => {
    const receivingData = data.receivingData || [];
    const feedingData = data.feedingData || [];
    const totalAircraft = receivingData.reduce((total, feed) => total + Number(feed.aircraftCount || 0), 0);
    const phones = data.alertPhoneNumbers || [];
    const health = data.system?.health || {};
    const memory = health.memory || {};
    const disk = health.disk || {};
    const cpu = health.cpu || {};
    const mongodb = health.mongodb || {};
    const redis = health.redis || {};

    $("#dashboard-title").textContent = dashboardGreeting(data.user);
    $("#dashboard-welcome").textContent = "Your station, receiving, feeding, and alert-recipient information is ready.";
    $("#dashboard-updated").textContent = `Updated ${formatDateTime(data.generatedAt)}`;
    summaryGrid.innerHTML = [
      summaryCard("Application uptime", formatUptime(data.system?.uptimeSeconds), `${formatNumber(data.system?.cpuCores)} CPU cores · ${formatNumber((data.system?.memoryUsedBytes || 0) / 1_048_576)} MB RSS`),
      summaryCard(
        "Server OS",
        data.system?.operatingSystem?.name || "Unknown",
        data.system?.operatingSystem?.isUbuntu
          ? `Ubuntu host confirmed · ${data.system.operatingSystem.architecture || "unknown architecture"}`
          : `Detected host · ${data.system?.operatingSystem?.architecture || "unknown architecture"}`
      ),
      summaryCard(
        "Data source",
        data.system?.server?.name || "Main server",
        data.system?.server?.hostname
          ? `${data.system.server.hostname} · Collected on the server`
          : "Collected on the server, never in this browser"
      ),
      summaryCard("Configured alerts", formatNumber(phones.length), "Phone numbers currently enabled for alerts"),
      summaryCard("Aircraft received", formatNumber(totalAircraft), `${receivingData.length} receiving source${receivingData.length === 1 ? "" : "s"}`)
    ].join("");
    healthGrid.innerHTML = [
      healthCard("RAM usage", `${formatBytes(memory.usedBytes)} / ${formatBytes(memory.totalBytes)}`, `${formatPercent(memory.usedPercent)} used · ${formatBytes(memory.availableBytes)} available`, memory.usedPercent),
      healthCard("CPU load", `${formatDecimal(cpu.oneMinuteLoad)} (1 min)`, `${formatNumber(cpu.cores)} cores · ${formatDecimal(cpu.oneMinuteLoadPerCore)} load per core`, Number(cpu.oneMinuteLoadPerCore) * 100),
      healthCard("Root disk", disk.available ? `${formatBytes(disk.usedBytes)} / ${formatBytes(disk.totalBytes)}` : "Unavailable", disk.available ? `${formatPercent(disk.usedPercent)} used · ${formatBytes(disk.availableBytes)} free on ${disk.mountPath || "/"}` : "Unable to inspect the main server root filesystem", disk.usedPercent),
      healthCard("MongoDB", mongodb.connected ? "Connected" : (mongodb.state || "Unavailable"), mongodb.connected ? `Main-server ping succeeded${Number.isFinite(Number(mongodb.latencyMs)) ? ` · ${mongodb.latencyMs} ms` : ""}` : "MongoDB is not available from the main server"),
      healthCard("Redis", redis.connected ? "Connected" : (redis.state || "Unavailable"), redis.connected ? `Main-server ping succeeded${Number.isFinite(Number(redis.latencyMs)) ? ` · ${redis.latencyMs} ms` : ""}` : "Redis is not available from the main server"),
      healthCard("System uptime", formatUptime(health.systemUptimeSeconds), "Ubuntu host uptime since its last reboot"),
      healthCard("Node process memory", formatBytes(health.processRssBytes), "Resident memory used by the dashboard backend")
    ].join("");
    stationGrid.innerHTML = (data.stations || []).map((station) => statsCard(station, "station")).join("") || '<p class="empty-state">No stations are configured.</p>';
    renderAdsbReceiver(data.adsbReceiver);
    latestGraphs1090 = data.graphs1090;
    if (activeDashboardTab === "sdr-health") renderGraphs1090(latestGraphs1090);
    receivingFeedGrid.innerHTML = receivingData.map((feed) => statsCard(feed, "feed")).join("") || '<p class="empty-state">No receiving sources are configured.</p>';
    feedingFeedGrid.innerHTML = feedingData.map((feed) => statsCard(feed, "feed", feed.metric)).join("") || '<p class="empty-state">No feeder clients are configured.</p>';
    phoneGrid.innerHTML = phones.map((phone) => `<article class="phone-card"><span>${escapeHtml(phone.label)}</span><strong>${escapeHtml(phone.number)}</strong><small>${escapeHtml(phone.variable)}</small></article>`).join("") || '<p class="empty-state">No alert phone numbers are configured.</p>';
    renderCityAlertEnabled(data.cityAlertEnabled);
    renderCityAlertRadii(data.cityAlertRadii);
    renderCityAlertEmailRecipients(data.cityAlertEmailRecipients);
  };

  const renderCityAlertRadii = (radii) => {
    const configuredRadii = radii || {};
    ["bangalore", "delhi", "hyderabad"].forEach((cityId) => {
      const input = cityAlertRadiiForm.elements.namedItem(cityId);
      const radiusMiles = Number(configuredRadii[cityId]);
      if (input && Number.isFinite(radiusMiles)) input.value = String(radiusMiles);
    });
    cityAlertRadiiNote.textContent = "Saved radii are active on the remote city alert loops.";
  };

  const renderCityAlertEnabled = (enabledByCity) => {
    const enabled = enabledByCity || {};
    const activeCities = [];
    ["bangalore", "delhi", "hyderabad"].forEach((cityId) => {
      const input = cityAlertEnabledForm.elements.namedItem(cityId);
      const isEnabled = enabled[cityId] === true;
      if (input) input.checked = isEnabled;
      if (isEnabled) activeCities.push(cityId);
    });
    cityAlertEnabledNote.textContent = activeCities.length
      ? `${activeCities.map((cityId) => cityId[0].toUpperCase() + cityId.slice(1)).join(", ")} tracking is active. Disabled cities do not query ADSBHub or send alerts.`
      : "All remote city tracking is disabled. No ADSBHub location lookups or alerts will run.";
  };

  const cityAlertRecipientCard = (cityId, label, recipients) => {
    const emails = Array.isArray(recipients) ? recipients : [];
    const recipientList = emails.length
      ? emails.map((email) => `<li><span>${escapeHtml(email)}</span><button class="city-alert-recipient-remove" type="button" data-city-id="${cityId}" data-email="${encodeURIComponent(email)}" aria-label="Remove ${escapeHtml(email)} from ${label} alerts">Remove</button></li>`).join("")
      : '<li class="city-alert-recipient-empty">No email recipients configured.</li>';
    return `<article class="city-alert-recipient-card"><h3>${label}</h3><ul class="city-alert-recipient-list">${recipientList}</ul></article>`;
  };

  const renderCityAlertEmailRecipients = (recipientsByCity) => {
    const recipients = recipientsByCity || {};
    cityAlertRecipientsGrid.innerHTML = [
      cityAlertRecipientCard("bangalore", "Bangalore", recipients.bangalore),
      cityAlertRecipientCard("delhi", "Delhi", recipients.delhi),
      cityAlertRecipientCard("hyderabad", "Hyderabad", recipients.hyderabad)
    ].join("");
    cityAlertRecipientNote.textContent = "Saved recipients receive subsequent alerts for their selected city.";
  };

  const loadDashboard = async () => {
    refreshButton.disabled = true;
    setStatus("Refreshing dashboard…");
    try {
      const response = await fetch("/api/dashboard/stats", { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load dashboard data.");
      renderDashboard(payload);
      setStatus("");
    } catch (error) {
      setStatus(error.message || "Unable to load dashboard data.", true);
    } finally {
      refreshButton.disabled = false;
    }
  };

  const loadVisitorLogs = async (force = false) => {
    if (visitorLogsLoading || (!force && visitorLogsLoaded)) return;

    visitorLogsLoading = true;
    refreshButton.disabled = true;
    visitorLogsSummary.textContent = "Refreshing visitor logs…";
    try {
      const response = await fetch("/api/dashboard/visitor-logs", { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load visitor logs.");
      renderVisitorLogs(payload);
      visitorLogsLoaded = true;
      setStatus("");
    } catch (error) {
      visitorLogsSummary.textContent = "Unable to load visitor logs.";
      visitorLogsGrid.innerHTML = '<p class="empty-state">Visitor logs could not be loaded.</p>';
      setStatus(error.message || "Unable to load visitor logs.", true);
    } finally {
      visitorLogsLoading = false;
      refreshButton.disabled = false;
    }
  };

  const updateReadsbGain = async (event) => {
    event.preventDefault();
    const mode = selectedGainMode();
    const gainDb = Number(gainManualInput.value);

    if (mode === "manual" && (!Number.isFinite(gainDb) || gainDb < 0 || gainDb > 59.6)) {
      gainControlStatus.textContent = "Enter a manual gain from 0 to 59.6 dB.";
      gainManualInput.focus();
      return;
    }

    gainControlSubmit.disabled = true;
    gainModeAutomatic.disabled = true;
    gainModeManual.disabled = true;
    gainManualInput.disabled = true;
    gainControlStatus.textContent = "Applying gain setting and restarting readsb…";
    try {
      const response = await fetch("/api/dashboard/readsb/gain", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(mode === "automatic" ? { mode } : { mode, gainDb })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !payload.success) throw new Error(payload.message || "Receiver gain could not be updated.");
      gainControlStatus.textContent = payload.message || "Gain setting applied.";
      await loadDashboard();
    } catch (error) {
      gainControlStatus.textContent = error.message || "Receiver gain could not be updated.";
    } finally {
      gainControlSubmit.disabled = false;
      gainModeAutomatic.disabled = false;
      gainModeManual.disabled = false;
      setGainControlMode();
    }
  };

  const updateCityAlertRadii = async (event) => {
    event.preventDefault();
    if (!cityAlertRadiiForm.reportValidity()) return;

    const radii = Object.fromEntries(
      ["bangalore", "delhi", "hyderabad"].map((cityId) => [
        cityId,
        Number(cityAlertRadiiForm.elements.namedItem(cityId).value)
      ])
    );
    cityAlertRadiiSaveButton.disabled = true;
    cityAlertRadiiNote.textContent = "Saving radii…";

    try {
      const response = await fetch("/api/dashboard/city-alert-radii", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ radii })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to update city alert radii.");
      renderCityAlertRadii(payload.cityAlertRadii);
      setStatus("City alert radii saved.");
    } catch (error) {
      cityAlertRadiiNote.textContent = "City alert radii could not be updated.";
      setStatus(error.message || "Unable to update city alert radii.", true);
    } finally {
      cityAlertRadiiSaveButton.disabled = false;
    }
  };

  const updateCityAlertEnabled = async (event) => {
    event.preventDefault();
    const enabled = Object.fromEntries(
      ["bangalore", "delhi", "hyderabad"].map((cityId) => [
        cityId,
        Boolean(cityAlertEnabledForm.elements.namedItem(cityId).checked)
      ])
    );
    cityAlertEnabledSaveButton.disabled = true;
    cityAlertEnabledNote.textContent = "Saving tracking settings…";

    try {
      const response = await fetch("/api/dashboard/city-alert-enabled", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ enabled })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to update city tracking settings.");
      renderCityAlertEnabled(payload.cityAlertEnabled);
      setStatus("City tracking and alert settings saved.");
    } catch (error) {
      cityAlertEnabledNote.textContent = "City tracking settings could not be updated.";
      setStatus(error.message || "Unable to update city tracking settings.", true);
    } finally {
      cityAlertEnabledSaveButton.disabled = false;
    }
  };

  const changeCityAlertEmailRecipient = async (method, cityId, email) => {
    cityAlertRecipientAddButton.disabled = true;
    cityAlertRecipientNote.textContent = `${method === "DELETE" ? "Removing" : "Adding"} email recipient…`;

    try {
      const response = await fetch("/api/dashboard/city-alert-email-recipients", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ cityId, email })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign("/login");
        return false;
      }
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to update city alert email recipients.");
      renderCityAlertEmailRecipients(payload.cityAlertEmailRecipients);
      setStatus(`City alert email recipient ${method === "DELETE" ? "removed" : "added"}.`);
      return true;
    } catch (error) {
      cityAlertRecipientNote.textContent = "City alert email recipients could not be updated.";
      setStatus(error.message || "Unable to update city alert email recipients.", true);
      return false;
    } finally {
      cityAlertRecipientAddButton.disabled = false;
    }
  };

  const addCityAlertEmailRecipient = async (event) => {
    event.preventDefault();
    if (!cityAlertRecipientForm.reportValidity()) return;

    const cityId = cityAlertRecipientForm.elements.namedItem("cityId").value;
    const emailInput = cityAlertRecipientForm.elements.namedItem("email");
    const didSave = await changeCityAlertEmailRecipient("POST", cityId, emailInput.value);
    if (didSave) emailInput.value = "";
  };

  const removeCityAlertEmailRecipient = async (event) => {
    const button = event.target.closest(".city-alert-recipient-remove");
    if (!button) return;

    let email;
    try {
      email = decodeURIComponent(button.dataset.email || "");
    } catch {
      setStatus("Unable to identify the selected email recipient.", true);
      return;
    }
    await changeCityAlertEmailRecipient("DELETE", button.dataset.cityId, email);
  };

  const setDashboardTab = (tab) => {
    activeDashboardTab = Object.hasOwn(dashboardPanels, tab) ? tab : "overview";
    Object.entries(dashboardPanels).forEach(([panelTab, panel]) => {
      panel.hidden = panelTab !== activeDashboardTab;
    });
    dashboardTabs.forEach((button) => {
      const active = button.dataset.dashboardTab === activeDashboardTab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });

    if (activeDashboardTab === "sdr-health" && latestGraphs1090) renderGraphs1090(latestGraphs1090);
    if (activeDashboardTab === "visitor-logs") loadVisitorLogs();
  };

  const updateVisitorLoggingSetting = async () => {
    const enabled = visitorLoggingToggle.checked;
    const previouslyEnabled = !enabled;
    visitorLoggingToggle.disabled = true;
    visitorLogsNote.textContent = `${enabled ? "Enabling" : "Disabling"} visitor logging…`;

    try {
      const response = await fetch("/api/dashboard/visitor-logs/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ enabled })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to update visitor logging.");
      visitorLogsLoaded = false;
      await loadVisitorLogs(true);
    } catch (error) {
      visitorLoggingToggle.checked = previouslyEnabled;
      visitorLoggingToggle.disabled = false;
      visitorLogsNote.textContent = "Visitor logging setting could not be updated.";
      setStatus(error.message || "Unable to update visitor logging.", true);
    }
  };

  const initMenu = () => {
    const menu = $(".menu-button");
    const links = $(".nav-links");
    menu.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      menu.setAttribute("aria-expanded", String(open));
      menu.textContent = open ? "×" : "☰";
    });
  };

  refreshButton.addEventListener("click", () => {
    if (activeDashboardTab === "visitor-logs") {
      loadVisitorLogs(true);
      return;
    }
    loadDashboard();
  });

  dashboardTabs.forEach((button) => button.addEventListener("click", () => setDashboardTab(button.dataset.dashboardTab)));
  visitorLoggingToggle.addEventListener("change", updateVisitorLoggingSetting);
  gainModeAutomatic.addEventListener("change", setGainControlMode);
  gainModeManual.addEventListener("change", setGainControlMode);
  gainControlForm.addEventListener("submit", updateReadsbGain);
  cityAlertRadiiForm.addEventListener("submit", updateCityAlertRadii);
  cityAlertEnabledForm.addEventListener("submit", updateCityAlertEnabled);
  cityAlertRecipientForm.addEventListener("submit", addCityAlertEmailRecipient);
  cityAlertRecipientsGrid.addEventListener("click", removeCityAlertEmailRecipient);
  initMenu();
  loadDashboard();
})();
