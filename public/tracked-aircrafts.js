(() => {
  const endpoint = "/trackedaircrafts";
  const state = { aircraft: [], filtered: [], lastLoadedAt: null };
  const $ = (selector) => document.querySelector(selector);
  const fields = ["search-input", "date-from", "date-to", "type-filter", "registration-filter", "operator-filter", "source-filter", "emergency-filter", "min-altitude", "max-altitude", "min-speed", "max-age", "field-filter", "field-value", "sort-by"];
  const display = (value, fallback = "—") => value === undefined || value === null || value === "" ? fallback : String(value).trim() || fallback;
  const number = (value) => typeof value === "number" ? value : Number(value);
  const finite = (value) => Number.isFinite(number(value)) ? number(value) : null;
  const field = (aircraft, ...names) => names.map((name) => aircraft[name]).find((value) => value !== undefined && value !== null && value !== "");
  const callsign = (aircraft) => display(field(aircraft, "callsign", "flight"));
  const registration = (aircraft) => display(field(aircraft, "registration", "r"));
  const type = (aircraft) => display(field(aircraft, "typeCode", "aircraftType", "t"));
  const operator = (aircraft) => display(field(aircraft, "operator", "ownOp"));
  const altitude = (aircraft) => finite(field(aircraft, "alt_baro", "alt_geom", "altitude"));
  const speed = (aircraft) => finite(field(aircraft, "gs", "tas", "speed"));
  const observedAt = (aircraft) => new Date(field(aircraft, "trackedAt", "lastUpdatedAt") || 0);
  const formatNumber = (value, suffix = "") => value === null ? "—" : `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)}${suffix}`;
  const formatDate = (date, options) => Number.isNaN(date.getTime()) ? "Unknown date" : new Intl.DateTimeFormat("en-GB", options).format(date);
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[char]);

  function selectOptions(id, values, label) {
    const select = $(id); const saved = select.value;
    select.replaceChildren(new Option(label, ""));
    [...values].filter(Boolean).sort((a, b) => a.localeCompare(b)).forEach((value) => select.add(new Option(value, value)));
    select.value = [...select.options].some((option) => option.value === saved) ? saved : "";
  }
  function populateFilters() {
    selectOptions("#type-filter", new Set(state.aircraft.map(type).filter((x) => x !== "—")), "All types");
    selectOptions("#registration-filter", new Set(state.aircraft.map(registration).filter((x) => x !== "—")), "All registrations");
    selectOptions("#operator-filter", new Set(state.aircraft.map(operator).filter((x) => x !== "—")), "All operators");
    selectOptions("#source-filter", new Set(state.aircraft.map((a) => display(a.type)).filter((x) => x !== "—")), "All sources");
    selectOptions("#emergency-filter", new Set(state.aircraft.map((a) => display(a.emergency, "none"))), "Any status");
    selectOptions("#field-filter", new Set(state.aircraft.flatMap((aircraft) => Object.keys(aircraft))), "Choose a field");
  }
  function currentFilters() { return Object.fromEntries(fields.map((id) => [id, $("#" + id).value.trim()])); }
  function recordMatches(aircraft, filters) {
    const query = filters["search-input"].toLocaleLowerCase();
    const haystack = Object.values(aircraft).flatMap((value) => typeof value === "object" ? JSON.stringify(value) : String(value)).join(" ").toLocaleLowerCase();
    const time = observedAt(aircraft); const date = !Number.isNaN(time) ? time.toISOString().slice(0, 10) : "";
    const alt = altitude(aircraft); const velocity = speed(aircraft);
    if (query && !haystack.includes(query)) return false;
    if (filters["date-from"] && (!date || date < filters["date-from"])) return false;
    if (filters["date-to"] && (!date || date > filters["date-to"])) return false;
    if (filters["type-filter"] && type(aircraft) !== filters["type-filter"]) return false;
    if (filters["registration-filter"] && registration(aircraft) !== filters["registration-filter"]) return false;
    if (filters["operator-filter"] && operator(aircraft) !== filters["operator-filter"]) return false;
    if (filters["source-filter"] && display(aircraft.type) !== filters["source-filter"]) return false;
    if (filters["emergency-filter"] && display(aircraft.emergency, "none") !== filters["emergency-filter"]) return false;
    if (filters["min-altitude"] && (alt === null || alt < Number(filters["min-altitude"]))) return false;
    if (filters["max-altitude"] && (alt === null || alt > Number(filters["max-altitude"]))) return false;
    if (filters["min-speed"] && (velocity === null || velocity < Number(filters["min-speed"]))) return false;
    if (filters["max-age"]) { const age = (Date.now() - time.getTime()) / 60000; if (Number.isNaN(age) || age > Number(filters["max-age"])) return false; }
    if (filters["field-value"]) { const selected = filters["field-filter"]; const candidate = selected ? aircraft[selected] : undefined; const raw = candidate && typeof candidate === "object" ? JSON.stringify(candidate) : String(candidate ?? ""); if (!raw.toLocaleLowerCase().includes(filters["field-value"].toLocaleLowerCase())) return false; }
    return true;
  }
  function sortRecords(records, sort) {
    const copy = [...records]; const byText = (get) => copy.sort((a,b) => get(a).localeCompare(get(b)));
    if (sort === "trackedAt-asc") return copy.sort((a,b) => observedAt(a) - observedAt(b));
    if (sort === "callsign-asc") return byText(callsign);
    if (sort === "altitude-desc") return copy.sort((a,b) => (altitude(b) ?? -Infinity) - (altitude(a) ?? -Infinity));
    if (sort === "speed-desc") return copy.sort((a,b) => (speed(b) ?? -Infinity) - (speed(a) ?? -Infinity));
    return copy.sort((a,b) => observedAt(b) - observedAt(a));
  }
  function renderMetrics() {
    const dates = new Set(state.aircraft.map((a) => { const d = observedAt(a); return Number.isNaN(d) ? null : d.toISOString().slice(0,10); }).filter(Boolean));
    $("#metric-total").textContent = state.aircraft.length.toLocaleString(); $("#metric-matching").textContent = state.filtered.length.toLocaleString();
    $("#metric-types").textContent = new Set(state.aircraft.map(type).filter((x) => x !== "—")).size.toLocaleString(); $("#metric-dates").textContent = dates.size.toLocaleString();
  }
  function renderChips(filters) {
    const labels = { "search-input":"Search", "date-from":"From", "date-to":"To", "type-filter":"Type", "registration-filter":"Registration", "operator-filter":"Operator", "source-filter":"Source", "emergency-filter":"Emergency", "min-altitude":"Min altitude", "max-altitude":"Max altitude", "min-speed":"Min speed", "max-age":"Max age", "field-filter":"Payload field", "field-value":"Field value" };
    $("#active-filters").innerHTML = Object.entries(labels).filter(([key]) => filters[key]).map(([key,label]) => `<span class="filter-chip">${label}: ${escapeHtml(filters[key])}${key.includes("altitude") ? " ft" : key === "min-speed" ? " kt" : key === "max-age" ? " min" : ""}</span>`).join("");
  }
  function row(aircraft) {
    const time = observedAt(aircraft); const emergency = display(aircraft.emergency, "none");
    return `<tr><td><span class="primary-cell">${escapeHtml(callsign(aircraft))}</span><span class="secondary">${escapeHtml(registration(aircraft))}</span></td><td><span class="primary-cell">${escapeHtml(display(aircraft.hex))}</span><span class="secondary">${escapeHtml(display(aircraft.type))}</span></td><td><span class="badge">${escapeHtml(type(aircraft))}</span><span class="secondary">${escapeHtml(display(field(aircraft,"description","desc")))}</span></td><td>${escapeHtml(operator(aircraft))}</td><td>${formatNumber(altitude(aircraft), " ft")}</td><td>${formatNumber(speed(aircraft), " kt")}</td><td>${aircraft.lat != null && aircraft.lon != null ? `${Number(aircraft.lat).toFixed(4)}, ${Number(aircraft.lon).toFixed(4)}` : "—"}</td><td><span class="badge${emergency !== "none" ? " alert" : ""}">${escapeHtml(emergency)}</span></td><td>${formatDate(time,{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</td><td><button class="details-button" type="button" data-aircraft="${escapeHtml(display(aircraft.hex,"record"))}">View details →</button></td></tr>`;
  }
  function renderResults() {
    const filters = currentFilters(); state.filtered = sortRecords(state.aircraft.filter((a) => recordMatches(a, filters)), filters["sort-by"]); renderMetrics(); renderChips(filters);
    $("#result-summary").textContent = `${state.filtered.length.toLocaleString()} of ${state.aircraft.length.toLocaleString()} aircraft`;
    const container = $("#aircraft-results"); container.replaceChildren();
    if (!state.filtered.length) { const empty = $("#empty-template").content.cloneNode(true); empty.querySelector("button").addEventListener("click", clearFilters); container.append(empty); return; }
    const groups = new Map(); state.filtered.forEach((a) => { const d = observedAt(a); const key = Number.isNaN(d) ? "Unknown date" : d.toISOString().slice(0,10); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(a); });
    groups.forEach((records, key) => { const date = key === "Unknown date" ? null : new Date(`${key}T12:00:00`); const section = document.createElement("section"); section.className = "date-group"; section.innerHTML = `<div class="date-heading"><h2>${date ? formatDate(date,{weekday:"long",day:"numeric",month:"long",year:"numeric"}) : key}</h2><span>${records.length} aircraft</span></div><div class="table-scroll"><table><thead><tr><th>Identity</th><th>ICAO / source</th><th>Aircraft</th><th>Operator</th><th>Altitude</th><th>Ground speed</th><th>Position</th><th>Status</th><th>Observed</th><th></th></tr></thead><tbody>${records.map(row).join("")}</tbody></table></div>`; container.append(section); });
    container.querySelectorAll("[data-aircraft]").forEach((button) => button.addEventListener("click", () => showDetails(state.filtered.find((a) => display(a.hex,"record") === button.dataset.aircraft))));
  }
  function showDetails(aircraft) { if (!aircraft) return; const dialog = $("#aircraft-dialog"); $("#dialog-title").textContent = `${callsign(aircraft)} · ${display(aircraft.hex)}`; const raw = Object.entries(aircraft).sort(([a],[b]) => a.localeCompare(b)); $("#dialog-content").innerHTML = `<div class="detail-content"><p class="lede">Full retained payload for this aircraft. Values not transmitted by the feed are omitted.</p><h3 class="detail-section-title">All available fields (${raw.length})</h3><div class="detail-grid">${raw.map(([key,value]) => `<div class="detail-item"><div class="detail-key">${escapeHtml(key.replace(/_/g," "))}</div><div class="detail-value">${escapeHtml(typeof value === "object" ? JSON.stringify(value) : display(value))}</div></div>`).join("")}</div></div>`; dialog.showModal(); }
  function clearFilters() { fields.forEach((id) => { if (id !== "sort-by") $("#" + id).value = ""; }); renderResults(); }
  async function loadAircraft() { const status = $("#connection-status"); status.className = "connection-status"; status.innerHTML = "<span></span> Loading archive"; try { const response = await fetch(endpoint, { headers:{Accept:"application/json"}, cache:"no-store" }); if (!response.ok) throw new Error(`Server returned ${response.status}`); const payload = await response.json(); if (!payload.status || !Array.isArray(payload.aircraftData)) throw new Error(payload.message || "Unexpected data format"); state.aircraft = payload.aircraftData; state.lastLoadedAt = new Date(); populateFilters(); renderResults(); status.className = "connection-status ready"; status.innerHTML = "<span></span> Archive connected"; $("#updated-at").textContent = `Loaded ${formatDate(state.lastLoadedAt,{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"})}`; } catch (error) { state.aircraft = []; renderResults(); status.className = "connection-status error"; status.innerHTML = "<span></span> Archive unavailable"; $("#result-summary").textContent = "Unable to load aircraft"; $("#aircraft-results").innerHTML = `<div class="empty-state"><span aria-hidden="true">!</span><h2>Could not load the tracked-aircraft archive</h2><p>${escapeHtml(error.message)}. Check that the Falcon Intelligence API is running, then refresh.</p></div>`; } }
  fields.forEach((id) => $("#" + id).addEventListener(id === "search-input" ? "input" : "change", renderResults));
  $("#clear-filters").addEventListener("click", clearFilters); $("#refresh-button").addEventListener("click", loadAircraft); $("#close-dialog").addEventListener("click", () => $("#aircraft-dialog").close()); $("#aircraft-dialog").addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });
  $("#toggle-filters").addEventListener("click", (event) => { const panel = $("#advanced-filters"); const hidden = panel.hidden = !panel.hidden; event.currentTarget.setAttribute("aria-expanded", String(!hidden)); event.currentTarget.innerHTML = `Advanced filters <span aria-hidden="true">${hidden ? "›" : "⌄"}</span>`; });
  loadAircraft();
})();
