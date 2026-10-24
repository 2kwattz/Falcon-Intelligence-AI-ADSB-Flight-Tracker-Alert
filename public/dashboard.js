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
  const cityAircraftForm = $("#city-aircraft-form");
  const cityAircraftCatalogueCity = $("#city-aircraft-catalogue-city");
  const cityAircraftCataloguesElement = $("#city-aircraft-catalogues");
  const cityAircraftNote = $("#city-aircraft-note");
  const cityAircraftSaveButton = $("#city-aircraft-save");
  const cityAircraftCancelButton = $("#city-aircraft-cancel");
  const masterCategoryFilter = $("#master-category-filter");
  const masterTypeFilter = $("#master-type-filter");
  const masterOperatorFilter = $("#master-operator-filter");
  const masterSearchFilter = $("#master-search-filter");
  const masterDatasetGroups = $("#master-dataset-groups");
  const masterDatasetSummary = $("#master-dataset-summary");
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
  const youtubeAutomationStatus = $("#youtube-automation-status");
  const youtubeAutomationContent = $("#youtube-automation-content");
  const youtubeAutomationSearch = $("#youtube-automation-search");
  const lyriaMusicForm = $("#lyria-music-form");
  const lyriaInfoButton = $("#lyria-info-button");
  const lyriaInfoDialog = $("#lyria-info-dialog");
  const lyriaInfoClose = $("#lyria-info-close");
  const lyriaSettingsButton = $("#lyria-settings-button");
  const lyriaSettingsDialog = $("#lyria-settings-dialog");
  const lyriaSettingsClose = $("#lyria-settings-close");
  const lyriaSettingsStatus = $("#lyria-settings-status");
  const lyriaMusicPrompt = $("#lyria-music-prompt");
  const lyriaPromptCount = $("#lyria-prompt-count");
  const lyriaRateForm = $("#lyria-rate-form");
  const lyriaRateSummary = $("#lyria-rate-summary");
  const lyriaMaxPromptTokens = $("#lyria-max-prompt-tokens");
  const lyriaMaxRequests = $("#lyria-max-requests");
  const lyriaWindowHours = $("#lyria-window-hours");
  const lyriaSaveLimitsButton = $("#lyria-save-limits");
  const lyriaMusicStatus = $("#lyria-music-status");
  const lyriaGenerateButton = $("#lyria-generate-button");
  const lyriaMusicOutput = $("#lyria-music-output");
  const lyriaOutputAudio = $("#lyria-output-audio");
  const lyriaOutputModel = $("#lyria-output-model");
  const lyriaOutputDownload = $("#lyria-output-download");
  const hinduCalendarDatasetStatus = $("#hindu-calendar-dataset-status");
  const hinduCalendarDatasetSummary = $("#hindu-calendar-dataset-summary");
  const hinduCalendarDetailsButton = $("#hindu-calendar-details");
  const hinduCalendarDeitiesButton = $("#hindu-calendar-deities");
  const hinduCalendarDialog = $("#hindu-calendar-dialog");
  const hinduCalendarDialogClose = $("#hindu-calendar-dialog-close");
  const hinduCalendarDialogStatus = $("#hindu-calendar-dialog-status");
  const hinduCalendarDialogContent = $("#hindu-calendar-dialog-content");
  const hinduCalendarDeitiesDialog = $("#hindu-calendar-deities-dialog");
  const hinduCalendarDeitiesDialogClose = $("#hindu-calendar-deities-dialog-close");
  const hinduCalendarDeitiesDialogStatus = $("#hindu-calendar-deities-dialog-status");
  const hinduCalendarDeitiesDialogContent = $("#hindu-calendar-deities-dialog-content");
  const dashboardTabs = document.querySelectorAll("[data-dashboard-tab]");
  const dashboardPanels = {
    overview: overviewPanel,
    "server-health": serverHealthPanel,
    "sdr-health": sdrHealthPanel,
    "feed-clients": feedClientsPanel,
    "flight-alerts": $("#flight-alerts-panel"),
    "master-dataset": $("#master-dataset-panel"),
    "visitor-logs": visitorLogsPanel,
    extras: $("#extras-panel")
  };
  let activeDashboardTab = "overview";
  let latestGraphs1090 = null;
  let visitorLogsLoaded = false;
  let visitorLogsLoading = false;
  let youtubeAutomationLoading = false;
  let lyriaMusicSettingsLoading = false;
  let hinduCalendarDatasetLoading = false;
  let hinduCalendarToday = null;
  let cityAircraftCatalogues = {};
  let masterDatasetAircraft = [];

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

  const formatCalendarDate = (value) => {
    const dateValue = String(value || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return "Today";
    const [year, month, day] = dateValue.split("-").map(Number);
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })
      .format(new Date(Date.UTC(year, month - 1, day)));
  };

  const occasionTitle = (occasion) => occasion?.name || occasion?.title || occasion?.festival_name || occasion?.festival_key || occasion?.event_key || "Untitled observance";

  const periodLabel = (period) => period?.start && period?.end ? `${period.start} – ${period.end}` : "Timing unavailable";

  const panchangCard = (label, value, detail = "") => `<article class="youtube-panchang-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "Unavailable")}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</article>`;

  const renderYoutubeAutomation = (payload) => {
    const data = payload?.data;
    youtubeAutomationSearch.hidden = Boolean(payload?.called);

    if (!payload?.called || !data) {
      youtubeAutomationStatus.textContent = `No festival or event has been searched for ${formatCalendarDate(payload?.date)} yet.`;
      youtubeAutomationContent.innerHTML = "";
      return;
    }

    const occasions = Array.isArray(data.occasions) ? data.occasions : [];
    const calendar = data.calendar || {};
    const activeFlags = Object.entries(calendar.special_day_flags || {})
      .filter(([, active]) => active === true)
      .map(([flag]) => flag.replace(/^is_/, "").replaceAll("_", " "));
    const panchang = [
      panchangCard("Day", calendar.vara?.name),
      panchangCard("Tithi", calendar.tithi?.full_name || calendar.tithi?.name, periodLabel(calendar.tithi?.period)),
      panchangCard("Nakshatra", calendar.nakshatra?.full_name || calendar.nakshatra?.name, periodLabel(calendar.nakshatra?.period)),
      panchangCard("Yoga", calendar.yoga?.full_name || calendar.yoga?.name, periodLabel(calendar.yoga?.period)),
      panchangCard("Karana", calendar.karana?.full_name || calendar.karana?.name, periodLabel(calendar.karana?.period)),
      panchangCard("Hindu month", calendar.hindu_calendar?.amanta || calendar.hindu_calendar?.purnimanta, calendar.hindu_calendar?.ritu || "")
    ].join("");
    const muhurat = calendar.muhurat || {};
    const timingEntries = [
      ["Brahma muhurta", muhurat.auspicious?.brahma_muhurta],
      ["Abhijit", muhurat.auspicious?.abhijit],
      ["Rahu kaal", muhurat.inauspicious?.rahu_kaal],
      ["Yamagandam", muhurat.inauspicious?.yamagandam],
      ["Gulika kaal", muhurat.inauspicious?.gulika_kaal]
    ].filter(([, time]) => time?.start_time && time?.end_time)
      .map(([label, time]) => `<li><strong>${escapeHtml(label)}</strong><span>${escapeHtml(`${time.start_time} – ${time.end_time}`)}</span></li>`).join("");
    const horaRows = Array.isArray(calendar.hora) ? calendar.hora.map((hora) => `<tr><td>${escapeHtml(hora.index_no)}</td><td>${escapeHtml(hora.planet_num)}</td><td>${escapeHtml(`${hora.start_time} – ${hora.end_time}`)}</td><td>${hora.is_day ? "Day" : "Night"}</td></tr>`).join("") : "";
    const choghadiyaRows = Array.isArray(calendar.choghadiya) ? calendar.choghadiya.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.period)}</td><td>${escapeHtml(`${item.start_time} – ${item.end_time}`)}</td><td>${item.is_auspicious ? "Auspicious" : "Inauspicious"}</td></tr>`).join("") : "";
    youtubeAutomationStatus.textContent = `Today's Hindu calendar is ready from ${data.provider || "TathaAstu"}.`;
    const cards = occasions.length
      ? occasions.map((occasion) => `<article class="youtube-festival-card"><strong>${escapeHtml(occasionTitle(occasion))}</strong><span>${escapeHtml(occasion.type || occasion.category || "Festival / event")}</span></article>`).join("")
      : "<p class=\"youtube-festival-meta\">The provider returned no named festivals or events for today.</p>";
    youtubeAutomationContent.innerHTML = `
      <p class="youtube-festival-meta">${escapeHtml(formatCalendarDate(data.date))} · ${formatNumber(occasions.length)} occasion${occasions.length === 1 ? "" : "s"}${activeFlags.length ? ` · ${escapeHtml(activeFlags.join(", "))}` : ""}</p>
      <div class="youtube-festival-list">${cards}</div>
      <section class="youtube-data-section"><h3>Panchang</h3><div class="youtube-panchang-grid">${panchang}</div></section>
      ${timingEntries ? `<section class="youtube-data-section"><h3>Muhurat timings</h3><ul class="youtube-timing-list">${timingEntries}</ul></section>` : ""}
      ${horaRows ? `<details class="youtube-details"><summary>Hora (${calendar.hora.length})</summary><div class="youtube-table-wrap"><table><thead><tr><th>#</th><th>Planet</th><th>Time</th><th>Period</th></tr></thead><tbody>${horaRows}</tbody></table></div></details>` : ""}
      ${choghadiyaRows ? `<details class="youtube-details"><summary>Choghadiya (${calendar.choghadiya.length})</summary><div class="youtube-table-wrap"><table><thead><tr><th>Name</th><th>Period</th><th>Time</th><th>Result</th></tr></thead><tbody>${choghadiyaRows}</tbody></table></div></details>` : ""}
      <details class="youtube-details"><summary>Complete raw TathaAstu API response</summary><pre>${escapeHtml(JSON.stringify(calendar, null, 2))}</pre></details>`;
  };

  const loadYoutubeAutomation = async () => {
    if (youtubeAutomationLoading) return;
    youtubeAutomationLoading = true;
    youtubeAutomationStatus.textContent = "Checking today’s Hindu calendar record…";
    youtubeAutomationSearch.hidden = true;

    try {
      const response = await fetch("/api/dashboard/youtube-automation/today", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to check today's festival or event.");
      renderYoutubeAutomation(payload);
    } catch (error) {
      youtubeAutomationStatus.textContent = error.message || "Unable to check today's festival or event.";
      youtubeAutomationContent.innerHTML = "";
      youtubeAutomationSearch.hidden = false;
    } finally {
      youtubeAutomationLoading = false;
    }
  };

  const searchYoutubeAutomation = async () => {
    youtubeAutomationSearch.disabled = true;
    youtubeAutomationStatus.textContent = "Searching today’s festival and event data…";

    try {
      const response = await fetch("/api/dashboard/youtube-automation/today", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" }
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to search today's festival or event.");
      renderYoutubeAutomation(payload);
      setStatus("Today's festival and event data is ready for YouTube automation.");
    } catch (error) {
      youtubeAutomationStatus.textContent = error.message || "Unable to search today's festival or event.";
      youtubeAutomationSearch.hidden = false;
      setStatus(error.message || "Unable to search today's festival or event.", true);
    } finally {
      youtubeAutomationSearch.disabled = false;
    }
  };

  const setLyriaMusicStatus = (message, isError = false, isSuccess = false) => {
    lyriaMusicStatus.textContent = message;
    lyriaMusicStatus.classList.toggle("error", isError);
    lyriaMusicStatus.classList.toggle("success", isSuccess);
  };

  const renderLyriaMusicSettings = (settings) => {
    if (!settings) return;
    lyriaMaxPromptTokens.value = settings.maxPromptTokens;
    lyriaMaxRequests.value = settings.maxRequests;
    lyriaWindowHours.value = settings.windowHours;
    const used = `${settings.usedRequests} of ${settings.maxRequests} generation${settings.maxRequests === 1 ? "" : "s"} used`;
    const remaining = `${settings.remainingRequests} remaining`;
    const reset = settings.resetsAt ? ` Next slot: ${formatDateTime(settings.resetsAt)}.` : "";
    lyriaRateSummary.textContent = `Prompt cap: ${Number(settings.maxPromptTokens).toLocaleString()} tokens · Usage: ${used} · ${remaining} · Window: ${settings.windowHours} hour${settings.windowHours === 1 ? "" : "s"}.${reset}`;
  };

  const loadLyriaMusicSettings = async () => {
    if (lyriaMusicSettingsLoading) return;
    lyriaMusicSettingsLoading = true;
    lyriaRateSummary.textContent = "Loading Lyria limits…";
    try {
      const response = await fetch("/api/lyria-music/settings", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) return window.location.assign("/login");
      if (!response.ok || !payload.success) throw new Error(payload.message || "Could not load Lyria Music Studio limits.");
      renderLyriaMusicSettings(payload.settings);
    } catch (error) {
      lyriaRateSummary.textContent = error.message || "Could not load Lyria Music Studio limits.";
    } finally {
      lyriaMusicSettingsLoading = false;
    }
  };

  const saveLyriaMusicSettings = async () => {
    lyriaSaveLimitsButton.disabled = true;
    lyriaSettingsStatus.textContent = "Saving limits…";
    lyriaSettingsStatus.classList.remove("error", "success");
    try {
      const response = await fetch("/api/lyria-music/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          maxPromptTokens: Number(lyriaMaxPromptTokens.value),
          maxRequests: Number(lyriaMaxRequests.value),
          windowHours: Number(lyriaWindowHours.value)
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) return window.location.assign("/login");
      if (!response.ok || !payload.success) throw new Error(payload.message || "Could not save Lyria Music Studio limits.");
      renderLyriaMusicSettings(payload.settings);
      lyriaSettingsStatus.textContent = payload.message;
      lyriaSettingsStatus.classList.add("success");
      setLyriaMusicStatus(payload.message, false, true);
    } catch (error) {
      lyriaSettingsStatus.textContent = error.message || "Could not save Lyria Music Studio limits.";
      lyriaSettingsStatus.classList.add("error");
    } finally {
      lyriaSaveLimitsButton.disabled = false;
    }
  };

  const generateLyriaMusic = async () => {
    const prompt = lyriaMusicPrompt.value.trim();
    if (!prompt) {
      setLyriaMusicStatus("Add a music prompt before generating.", true);
      lyriaMusicPrompt.focus();
      return;
    }

    lyriaGenerateButton.disabled = true;
    lyriaMusicOutput.hidden = true;
    lyriaOutputAudio.removeAttribute("src");
    lyriaOutputDownload.removeAttribute("href");
    setLyriaMusicStatus("Lyria 3.5 is composing your track. This can take a few minutes…");
    try {
      const response = await fetch("/api/lyria-music/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ prompt })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) return window.location.assign("/login");
      if (!response.ok || !payload.success) throw new Error(payload.message || "Could not generate music.");

      lyriaOutputAudio.src = payload.music.outputUrl;
      lyriaOutputDownload.href = payload.music.outputUrl;
      lyriaOutputModel.textContent = `Generated with ${payload.music.model}`;
      lyriaMusicOutput.hidden = false;
      renderLyriaMusicSettings(payload.rateLimit);
      setLyriaMusicStatus(payload.message, false, true);
    } catch (error) {
      setLyriaMusicStatus(error.message || "Could not generate music.", true);
    } finally {
      lyriaGenerateButton.disabled = false;
    }
  };

  const hinduObservanceName = (item) => {
    if (typeof item === "string") return item;
    return item?.name || item?.title || item?.festival_name || item?.festival_key || item?.event_key || "Special observance";
  };

  const renderHinduCalendarDatasetToday = (data) => {
    hinduCalendarToday = data;
    hinduCalendarDetailsButton.hidden = !data;
    if (!data) {
      hinduCalendarDatasetStatus.textContent = "No dataset record is available for today.";
      hinduCalendarDatasetSummary.innerHTML = "";
      return;
    }
    const observances = Array.isArray(data.observances) ? data.observances : [];
    const mantraVideos = Array.isArray(data.mantraVideos) ? data.mantraVideos : [];
    const month = data.hinduMonth?.amanta_hi || data.hinduMonth?.amanta || data.hinduMonth?.purnimanta_hi || data.hinduMonth?.purnimanta || "Unavailable";
    const facts = [["Date", formatCalendarDate(data.date)], ["Weekday", [data.weekdayHi, data.weekday].filter(Boolean).join(" · ") || "Unavailable"], ["Hindu month", month], ["Location", data.location?.city || "Vadodara"]];
    const observanceMarkup = observances.length
      ? observances.map((item) => `<span class="hindu-calendar-observance">${escapeHtml(hinduObservanceName(item))}</span>`).join("")
      : "<span class=\"hindu-calendar-observance\">No listed observance today</span>";
    const mantraMarkup = mantraVideos.length
      ? `<section class="hindu-calendar-mantras"><h4>Mantras available for video creation</h4><div class="hindu-calendar-mantra-grid">${mantraVideos.map((mantra) => { const repetition = mantra.repetitionCount ? `${mantra.repetitionCount} repetitions` : "Repetition count in details"; const mala = mantra.malaCount ? `${mantra.malaCount} mala${mantra.malaCount === 1 ? "" : "s"}` : ""; return `<article><strong>${escapeHtml(mantra.mantraName || "Unnamed mantra")}</strong>${mantra.mantraNameHi ? `<p>${escapeHtml(mantra.mantraNameHi)}</p>` : ""}${mantra.mantraTextDevanagari ? `<span>${escapeHtml(mantra.mantraTextDevanagari)}</span>` : ""}${mantra.mantraTransliteration ? `<small>${escapeHtml(mantra.mantraTransliteration)}</small>` : ""}<div class="hindu-calendar-mantra-meta">${escapeHtml([mantra.associatedDeity, repetition, mala].filter(Boolean).join(" · "))}</div></article>`; }).join("")}</div></section>`
      : "";
    hinduCalendarDatasetStatus.textContent = data.hasListedObservance
      ? `${observances.length} listed special day${observances.length === 1 ? "" : "s"} for today.`
      : mantraVideos.length
        ? "No named observance is listed for today; a mantra is ready to use for a devotional video."
        : "No named observance or mantra video is listed for today; the day’s Panchang and weekday tradition are available.";
    hinduCalendarDatasetSummary.innerHTML = `<div class="hindu-calendar-day-facts">${facts.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div><div class="hindu-calendar-observances">${observanceMarkup}</div>${mantraMarkup}`;
  };

  const loadHinduCalendarDatasetToday = async () => {
    if (hinduCalendarDatasetLoading) return;
    hinduCalendarDatasetLoading = true;
    hinduCalendarDatasetStatus.textContent = "Loading today’s calendar data…";
    try {
      const response = await fetch("/api/dashboard/hindu-calendar/today", { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) return window.location.assign("/login");
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load today’s calendar data.");
      renderHinduCalendarDatasetToday(payload.data);
    } catch (error) {
      hinduCalendarToday = null;
      hinduCalendarDetailsButton.hidden = true;
      hinduCalendarDatasetSummary.innerHTML = "";
      hinduCalendarDatasetStatus.textContent = error.message || "Unable to load today’s calendar data.";
    } finally {
      hinduCalendarDatasetLoading = false;
    }
  };

  const showHinduCalendarDetails = async () => {
    if (!hinduCalendarToday?.date) return;
    hinduCalendarDialogStatus.textContent = "Loading all details…";
    hinduCalendarDialogContent.innerHTML = "";
    hinduCalendarDialog.showModal();
    try {
      const response = await fetch(`/api/dashboard/hindu-calendar/${encodeURIComponent(hinduCalendarToday.date)}`, { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load calendar details.");
      hinduCalendarDialogStatus.textContent = `${formatCalendarDate(payload.date)} · all stored day information`;
      hinduCalendarDialogContent.innerHTML = `<pre>${escapeHtml(JSON.stringify(payload.details, null, 2))}</pre>`;
    } catch (error) {
      hinduCalendarDialogStatus.textContent = error.message || "Unable to load calendar details.";
    }
  };

  const showHinduCalendarDeities = async () => {
    hinduCalendarDeitiesDialogStatus.textContent = "Loading deities from the mantra dataset…";
    hinduCalendarDeitiesDialogContent.innerHTML = "";
    hinduCalendarDeitiesDialog.showModal();
    try {
      const response = await fetch("/api/dashboard/hindu-calendar/mantra-deities", { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) return window.location.assign("/login");
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load included deities.");
      const deities = Array.isArray(payload.deities) ? payload.deities : [];
      hinduCalendarDeitiesDialogStatus.textContent = deities.length
        ? `${deities.length} deities are represented across ${formatNumber(payload.totalMantraVideos)} mantra videos.`
        : "No mantra deities are available in the imported dataset.";
      hinduCalendarDeitiesDialogContent.innerHTML = deities.map((deity) => `<article><strong>${escapeHtml(deity.name)}</strong>${deity.nameHi ? `<span>${escapeHtml(deity.nameHi)}</span>` : ""}<small>${escapeHtml(`${formatNumber(deity.videoCount)} mantra video${deity.videoCount === 1 ? "" : "s"}`)}</small></article>`).join("");
    } catch (error) {
      hinduCalendarDeitiesDialogStatus.textContent = error.message || "Unable to load included deities.";
    }
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
    const cpuTemperature = health.cpuTemperature || {};
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
      healthCard("CPU temperature", cpuTemperature.available ? `${formatDecimal(cpuTemperature.celsius)} °C` : "Unavailable", cpuTemperature.available ? `${formatDecimal((Number(cpuTemperature.celsius) * 9 / 5) + 32)} °F · ${cpuTemperature.source || "CPU thermal sensor"}` : "No readable CPU thermal sensor is available to the dashboard service", cpuTemperature.available ? Number(cpuTemperature.celsius) : null),
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
    renderCityAircraftCatalogues(data.cityAircraftCatalogues);
    renderMasterDataset(data.masterDatasetAircraft);
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

  const renderCityAircraftCatalogues = (catalogues) => {
    cityAircraftCatalogues = catalogues || {};
    const cityId = cityAircraftCatalogueCity.value;
    const catalogue = cityAircraftCatalogues[cityId] || {};
    const aircraft = Array.isArray(catalogue.aircraft) ? catalogue.aircraft : [];
    const cityLabel = catalogue.label || cityAircraftCatalogueCity.selectedOptions[0]?.textContent || cityId;
    const rows = aircraft.map((item) => `<tr><td>${escapeHtml(item.group)}</td><td>${escapeHtml(item.Registration)}</td><td>${escapeHtml(item.AircraftType)}</td><td>${escapeHtml(item.TypeCode)}</td><td>${escapeHtml(item.AircraftOperator)}</td><td>${escapeHtml(item.HexCode)}</td><td><div class="city-aircraft-row-actions"><button type="button" data-aircraft-action="edit" data-city-id="${cityId}" data-hex-code="${escapeHtml(item.HexCode)}" data-registration="${escapeHtml(item.Registration)}">Edit</button><button class="danger" type="button" data-aircraft-action="delete" data-city-id="${cityId}" data-hex-code="${escapeHtml(item.HexCode)}" data-registration="${escapeHtml(item.Registration)}">Remove</button></div></td></tr>`).join("") || '<tr><td colspan="7" class="inactive">No aircraft in this catalogue.</td></tr>';
    cityAircraftCataloguesElement.innerHTML = `<article class="city-aircraft-city"><h3>${escapeHtml(cityLabel)}<span>${formatNumber(aircraft.length)} aircraft</span></h3><div class="city-aircraft-table-wrap"><table class="city-aircraft-table"><thead><tr><th>Group</th><th>Registration</th><th>Type</th><th>Code</th><th>Operator</th><th>Hex</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div></article>`;
    cityAircraftNote.textContent = `Showing the active ${cityLabel} aircraft catalogue. Every listed aircraft with a valid ICAO is included in alert matching.`;
  };

  const setMasterFilterOptions = (select, values, label) => {
    const selected = select.value || "all";
    select.innerHTML = `<option value="all">All ${label}</option>${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
    select.value = values.includes(selected) ? selected : "all";
  };

  const masterAircraftType = (aircraft) => aircraft.AircraftType || aircraft.PredictedAircraftType || aircraft.group || "Unknown";

  const applyMasterDatasetFilters = () => {
    const category = masterCategoryFilter.value;
    const type = masterTypeFilter.value;
    const operator = masterOperatorFilter.value;
    const search = masterSearchFilter.value.trim().toLowerCase();
    const filtered = masterDatasetAircraft.filter((aircraft) => {
      const searchable = [aircraft.group, aircraft.Registration, aircraft.AircraftType, aircraft.TypeCode, aircraft.AircraftOperator, aircraft.HexCode, aircraft.PredictedReg, aircraft.PredictedAircraftType].join(" ").toLowerCase();
      return (category === "all" || aircraft.category === category) &&
        (type === "all" || masterAircraftType(aircraft) === type) &&
        (operator === "all" || aircraft.AircraftOperator === operator) &&
        (!search || searchable.includes(search));
    });
    const aircraftByType = filtered.reduce((groups, aircraft) => {
      const aircraftType = masterAircraftType(aircraft);
      (groups[aircraftType] ||= []).push(aircraft);
      return groups;
    }, {});
    const filtersApplied = category !== "all" || type !== "all" || operator !== "all" || Boolean(search);
    masterDatasetGroups.innerHTML = Object.entries(aircraftByType).sort(([firstType], [secondType]) => firstType.localeCompare(secondType)).map(([aircraftType, records]) => {
      const rows = records.map((aircraft) => {
        const unconfirmed = aircraft.category === "Unconfirmed";
        return `<tr class="${unconfirmed ? "inactive" : ""}"><td>${escapeHtml(aircraft.category)}</td><td>${escapeHtml(aircraft.Registration === "Unknown" ? aircraft.PredictedReg || "Unknown" : aircraft.Registration)}</td><td>${escapeHtml(aircraft.TypeCode || aircraft.PredictedType || "—")}</td><td>${escapeHtml(aircraft.AircraftOperator === "Unknown" ? aircraft.PredictedAircraftOperator || "Unknown" : aircraft.AircraftOperator)}</td><td>${escapeHtml(aircraft.HexCode)}</td><td>${unconfirmed ? "Reported / unconfirmed" : "Reference record"}</td></tr>`;
      }).join("");
      return `<details class="master-dataset-group"${filtersApplied ? " open" : ""}><summary><span>${escapeHtml(aircraftType)}</span><small>${formatNumber(records.length)} aircraft</small></summary><div class="city-aircraft-table-wrap"><table class="city-aircraft-table master-dataset-table"><thead><tr><th>Category</th><th>Registration</th><th>Type code</th><th>Operator</th><th>ICAO / Mode-S</th><th>Confidence</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
    }).join("") || '<p class="empty-state">No aircraft match these filters.</p>';
    masterDatasetSummary.textContent = `${formatNumber(filtered.length)} of ${formatNumber(masterDatasetAircraft.length)} reference records shown. Commercial has no records in the current master dataset.`;
  };

  const renderMasterDataset = (aircraft) => {
    masterDatasetAircraft = Array.isArray(aircraft) ? aircraft : [];
    setMasterFilterOptions(masterTypeFilter, [...new Set(masterDatasetAircraft.map(masterAircraftType).filter(Boolean))].sort(), "aircraft types");
    setMasterFilterOptions(masterOperatorFilter, [...new Set(masterDatasetAircraft.map((item) => item.AircraftOperator).filter(Boolean))].sort(), "operators");
    applyMasterDatasetFilters();
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

  const resetCityAircraftForm = () => {
    cityAircraftForm.reset();
    cityAircraftForm.elements.namedItem("originalHexCode").value = "";
    cityAircraftForm.elements.namedItem("originalRegistration").value = "";
    cityAircraftForm.elements.namedItem("cityId").disabled = false;
    cityAircraftSaveButton.textContent = "Add aircraft";
    cityAircraftCancelButton.hidden = true;
  };

  const cityAircraftPayload = () => ({
    cityId: cityAircraftForm.elements.namedItem("cityId").value,
    group: cityAircraftForm.elements.namedItem("group").value,
    aircraft: {
      Registration: cityAircraftForm.elements.namedItem("registration").value,
      AircraftType: cityAircraftForm.elements.namedItem("aircraftType").value,
      TypeCode: cityAircraftForm.elements.namedItem("typeCode").value,
      AircraftOperator: cityAircraftForm.elements.namedItem("operator").value,
      HexCode: cityAircraftForm.elements.namedItem("hexCode").value
    }
  });

  const saveCityAircraft = async (event) => {
    event.preventDefault();
    if (!cityAircraftForm.reportValidity()) return;
    const payload = cityAircraftPayload();
    const originalHex = cityAircraftForm.elements.namedItem("originalHexCode").value;
    const originalRegistration = cityAircraftForm.elements.namedItem("originalRegistration").value;
    const isEditing = Boolean(originalHex);
    cityAircraftSaveButton.disabled = true;
    cityAircraftNote.textContent = `${isEditing ? "Saving" : "Adding"} aircraft to the city file…`;
    try {
      const response = await fetch(
        isEditing
          ? `/api/dashboard/city-aircraft/${encodeURIComponent(payload.cityId)}/${encodeURIComponent(originalHex)}?registration=${encodeURIComponent(originalRegistration)}`
          : "/api/dashboard/city-aircraft",
        {
          method: isEditing ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload)
        }
      );
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to update the city aircraft file.");
      renderCityAircraftCatalogues(result.cityAircraftCatalogues);
      resetCityAircraftForm();
      setStatus(`Aircraft ${isEditing ? "updated" : "added"}.`);
    } catch (error) {
      cityAircraftNote.textContent = "The city aircraft file could not be updated.";
      setStatus(error.message || "Unable to update the city aircraft file.", true);
    } finally {
      cityAircraftSaveButton.disabled = false;
    }
  };

  const manageCityAircraft = async (event) => {
    const button = event.target.closest("[data-aircraft-action]");
    if (!button) return;
    const cityId = button.dataset.cityId;
    const hexCode = button.dataset.hexCode;
    const registration = button.dataset.registration;
    const catalogue = cityAircraftCatalogues[cityId];
    const record = catalogue?.aircraft?.find((item) => item.HexCode === hexCode && item.Registration === registration);
    if (!record) {
      setStatus("The selected aircraft is no longer in this catalogue. Refresh the dashboard and try again.", true);
      return;
    }
    if (button.dataset.aircraftAction === "edit") {
      cityAircraftForm.elements.namedItem("cityId").value = cityId;
      cityAircraftForm.elements.namedItem("cityId").disabled = true;
      cityAircraftForm.elements.namedItem("group").value = record.group || "";
      cityAircraftForm.elements.namedItem("registration").value = record.Registration || "";
      cityAircraftForm.elements.namedItem("aircraftType").value = record.AircraftType || "";
      cityAircraftForm.elements.namedItem("typeCode").value = record.TypeCode || "";
      cityAircraftForm.elements.namedItem("operator").value = record.AircraftOperator || "";
      cityAircraftForm.elements.namedItem("hexCode").value = record.HexCode || "";
      cityAircraftForm.elements.namedItem("originalHexCode").value = record.HexCode || "";
      cityAircraftForm.elements.namedItem("originalRegistration").value = record.Registration || "";
      cityAircraftSaveButton.textContent = "Save aircraft";
      cityAircraftCancelButton.hidden = false;
      cityAircraftForm.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    button.disabled = true;
    const approved = await window.FalconToast.confirm({
      message: `Remove ${record.Registration || record.HexCode} from the ${catalogue.label || cityId} aircraft file?`,
      confirmLabel: "Remove"
    });
    if (!approved) {
      button.disabled = false;
      return;
    }
    cityAircraftNote.textContent = "Removing aircraft from the city file…";
    try {
      const response = await fetch(`/api/dashboard/city-aircraft/${encodeURIComponent(cityId)}/${encodeURIComponent(hexCode)}?registration=${encodeURIComponent(registration)}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" }
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to remove the aircraft.");
      renderCityAircraftCatalogues(result.cityAircraftCatalogues);
      resetCityAircraftForm();
      setStatus("Aircraft removed.");
    } catch (error) {
      cityAircraftNote.textContent = "The aircraft could not be removed from the city file.";
      setStatus(error.message || "Unable to remove the aircraft.", true);
    } finally {
      if (button.isConnected) button.disabled = false;
    }
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
    if (activeDashboardTab === "extras") {
      loadYoutubeAutomation();
      loadHinduCalendarDatasetToday();
      loadLyriaMusicSettings();
    }
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
    if (activeDashboardTab === "extras") {
      loadYoutubeAutomation();
      loadHinduCalendarDatasetToday();
      loadLyriaMusicSettings();
      return;
    }
    loadDashboard();
  });

  dashboardTabs.forEach((button) => button.addEventListener("click", () => setDashboardTab(button.dataset.dashboardTab)));
  visitorLoggingToggle.addEventListener("change", updateVisitorLoggingSetting);
  youtubeAutomationSearch.addEventListener("click", searchYoutubeAutomation);
  lyriaMusicPrompt.addEventListener("input", () => {
    lyriaPromptCount.textContent = `${lyriaMusicPrompt.value.length.toLocaleString()} / 12,000 characters`;
  });
  lyriaMusicForm.addEventListener("submit", (event) => { event.preventDefault(); generateLyriaMusic(); });
  lyriaRateForm.addEventListener("submit", (event) => { event.preventDefault(); saveLyriaMusicSettings(); });
  lyriaInfoButton.addEventListener("click", () => lyriaInfoDialog.showModal());
  lyriaInfoClose.addEventListener("click", () => lyriaInfoDialog.close());
  lyriaInfoDialog.addEventListener("click", (event) => { if (event.target === lyriaInfoDialog) lyriaInfoDialog.close(); });
  lyriaSettingsButton.addEventListener("click", () => {
    lyriaSettingsStatus.textContent = "";
    lyriaSettingsStatus.classList.remove("error", "success");
    lyriaSettingsDialog.showModal();
  });
  lyriaSettingsClose.addEventListener("click", () => lyriaSettingsDialog.close());
  lyriaSettingsDialog.addEventListener("click", (event) => { if (event.target === lyriaSettingsDialog) lyriaSettingsDialog.close(); });
  hinduCalendarDetailsButton.addEventListener("click", showHinduCalendarDetails);
  hinduCalendarDeitiesButton.addEventListener("click", showHinduCalendarDeities);
  hinduCalendarDialogClose.addEventListener("click", () => hinduCalendarDialog.close());
  hinduCalendarDialog.addEventListener("click", (event) => { if (event.target === hinduCalendarDialog) hinduCalendarDialog.close(); });
  hinduCalendarDeitiesDialogClose.addEventListener("click", () => hinduCalendarDeitiesDialog.close());
  hinduCalendarDeitiesDialog.addEventListener("click", (event) => { if (event.target === hinduCalendarDeitiesDialog) hinduCalendarDeitiesDialog.close(); });
  gainModeAutomatic.addEventListener("change", setGainControlMode);
  gainModeManual.addEventListener("change", setGainControlMode);
  gainControlForm.addEventListener("submit", updateReadsbGain);
  cityAlertRadiiForm.addEventListener("submit", updateCityAlertRadii);
  cityAlertEnabledForm.addEventListener("submit", updateCityAlertEnabled);
  cityAlertRecipientForm.addEventListener("submit", addCityAlertEmailRecipient);
  cityAlertRecipientsGrid.addEventListener("click", removeCityAlertEmailRecipient);
  cityAircraftForm.addEventListener("submit", saveCityAircraft);
  cityAircraftCancelButton.addEventListener("click", resetCityAircraftForm);
  cityAircraftCatalogueCity.addEventListener("change", () => renderCityAircraftCatalogues(cityAircraftCatalogues));
  cityAircraftCataloguesElement.addEventListener("click", manageCityAircraft);
  [masterCategoryFilter, masterTypeFilter, masterOperatorFilter].forEach((filter) => filter.addEventListener("change", applyMasterDatasetFilters));
  masterSearchFilter.addEventListener("input", applyMasterDatasetFilters);
  initMenu();
  loadDashboard();
})();
