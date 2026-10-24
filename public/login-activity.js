(() => {
  const $ = (selector) => document.querySelector(selector);
  const status = $("#login-activity-status");
  const list = $("#login-activity-list");
  const clearButton = $("#clear-login-activity");
  let activityCount = 0;

  const formatDateTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unavailable";
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(date);
  };

  const addCell = (row, value) => {
    const cell = document.createElement("td");
    cell.textContent = value || "Unavailable";
    row.append(cell);
  };

  const addDeviceCell = (row, activity) => {
    const cell = document.createElement("td");
    const device = document.createElement("strong");
    const software = document.createElement("span");
    device.textContent = activity.device || "Not recorded";
    software.textContent = [activity.browser, activity.operatingSystem].filter(Boolean).join(" · ") || "Not recorded";
    cell.className = "activity-device";
    cell.append(device, software);
    row.append(cell);
  };

  const renderActivity = (activities) => {
    list.replaceChildren();
    activityCount = Array.isArray(activities) ? activities.length : 0;
    clearButton.disabled = activityCount === 0;
    if (!activityCount) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.className = "activity-empty";
      cell.textContent = "No successful logins are stored in the last three days.";
      row.append(cell);
      list.append(row);
      return;
    }
    activities.forEach((activity) => {
      const row = document.createElement("tr");
      addCell(row, activity.username);
      addDeviceCell(row, activity);
      addCell(row, formatDateTime(activity.loggedInAt));
      addCell(row, activity.ipAddress);
      list.append(row);
    });
  };

  const loadActivity = async () => {
    status.textContent = "Loading login activity…";
    try {
      const response = await fetch("/auth/mongo/login-activity", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) return window.location.assign("/login");
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load login activity.");
      renderActivity(payload.activities);
      status.textContent = activityCount
        ? `${activityCount} successful login${activityCount === 1 ? "" : "s"} in the last ${payload.retentionDays || 3} days. Times are shown in India Standard Time.`
        : "No successful logins are stored in the last three days.";
    } catch (error) {
      clearButton.disabled = true;
      status.textContent = error.message || "Unable to load login activity.";
      status.classList.add("error");
    }
  };

  clearButton.addEventListener("click", async () => {
    if (!activityCount) return;
    clearButton.disabled = true;
    const approved = await window.FalconToast.confirm({
      message: "Clear all login activity? This cannot be undone.",
      confirmLabel: "Clear history"
    });
    if (!approved) {
      clearButton.disabled = activityCount === 0;
      return;
    }
    status.textContent = "Clearing login history…";
    try {
      const response = await fetch("/auth/mongo/login-activity", {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" }
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) return window.location.assign("/login");
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to clear login history.");
      renderActivity([]);
      status.textContent = payload.message || "Login history cleared.";
      status.classList.remove("error");
      window.FalconToast.show(payload.message || "Login history cleared.", { tone: "success" });
    } catch (error) {
      status.textContent = error.message || "Unable to clear login history.";
      status.classList.add("error");
      clearButton.disabled = false;
      window.FalconToast.show(error.message || "Unable to clear login history.", { tone: "error" });
    }
  });

  loadActivity();
})();
