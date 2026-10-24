(() => {
  const regionId = "falcon-toast-region";

  const getRegion = () => {
    let region = document.getElementById(regionId);
    if (region) return region;
    region = document.createElement("section");
    region.id = regionId;
    region.className = "falcon-toast-region";
    region.setAttribute("aria-label", "Notifications");
    document.body.append(region);
    return region;
  };

  const removeToast = (toast) => {
    if (!toast?.isConnected || toast.dataset.closing === "true") return;
    toast.dataset.closing = "true";
    toast.classList.add("leaving");
    window.setTimeout(() => toast.remove(), 180);
  };

  const createToast = ({ message, tone = "info", role = "status" }) => {
    const toast = document.createElement("article");
    toast.className = `falcon-toast ${tone}`;
    toast.setAttribute("role", role);
    toast.setAttribute("aria-live", role === "alertdialog" ? "assertive" : "polite");

    const content = document.createElement("div");
    content.className = "falcon-toast-message";
    content.textContent = message;

    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "falcon-toast-dismiss";
    dismiss.setAttribute("aria-label", "Dismiss notification");
    dismiss.textContent = "×";

    toast.append(content, dismiss);
    getRegion().append(toast);
    return { toast, dismiss };
  };

  const show = (message, { tone = "info", duration = 5000 } = {}) => {
    const { toast, dismiss } = createToast({ message, tone });
    let timeout = null;
    const close = () => {
      if (timeout) window.clearTimeout(timeout);
      removeToast(toast);
    };
    dismiss.addEventListener("click", close);
    if (duration > 0) timeout = window.setTimeout(close, duration);
    return { close };
  };

  const confirm = ({ message, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "danger" }) => new Promise((resolve) => {
    const { toast, dismiss } = createToast({ message, tone, role: "alertdialog" });
    const actions = document.createElement("div");
    actions.className = "falcon-toast-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "falcon-toast-action";
    cancel.textContent = cancelLabel;
    const approve = document.createElement("button");
    approve.type = "button";
    approve.className = `falcon-toast-action ${tone === "danger" ? "danger" : "primary"}`;
    approve.textContent = confirmLabel;
    actions.append(cancel, approve);
    toast.append(actions);

    let settled = false;
    const finish = (approved) => {
      if (settled) return;
      settled = true;
      removeToast(toast);
      resolve(approved);
    };
    dismiss.addEventListener("click", () => finish(false));
    cancel.addEventListener("click", () => finish(false));
    approve.addEventListener("click", () => finish(true));
    approve.focus();
  });

  window.FalconToast = Object.freeze({ show, confirm });
})();
