(() => {
  const authSlots = [...document.querySelectorAll("[data-auth-nav]")];
  const sharedLinks = [
    { href: "/", label: "Home" },
    { href: "/tracked-aircrafts", label: "Intelligence Archive" },
    { href: "/live-map", label: "Live Map" },
    { href: "/explore", label: "Explore" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" }
  ];

  const normalizePath = (path) => path.replace(/\/+$/, "") || "/";

  const renderSharedLinks = () => {
    const currentPath = normalizePath(window.location.pathname);

    document.querySelectorAll(".site-header nav .nav-links").forEach((container) => {
      container.replaceChildren(...sharedLinks.map((link) => {
        const anchor = document.createElement("a");
        anchor.href = link.href;
        anchor.textContent = link.label;
        if (normalizePath(link.href) === currentPath) anchor.classList.add("active");
        return anchor;
      }));

      container.querySelectorAll("a").forEach((anchor) => anchor.addEventListener("click", () => {
        container.classList.remove("open");
        const menuButton = container.parentElement?.querySelector(".menu-button");
        menuButton?.setAttribute("aria-expanded", "false");
        if (menuButton) menuButton.textContent = "☰";
      }));
    });
  };

  renderSharedLinks();

  const closeMenus = () => document.querySelectorAll(".profile-menu.open").forEach((menu) => {
    menu.classList.remove("open");
    menu.querySelector(".profile-trigger")?.setAttribute("aria-expanded", "false");
  });

  const renderProfileMenu = (slot) => {
    const menu = document.createElement("div");
    const trigger = document.createElement("button");
    const dropdown = document.createElement("div");
    const profileLink = document.createElement("a");
    const dashboardLink = document.createElement("a");
    const logoutButton = document.createElement("button");

    menu.className = "profile-menu";
    trigger.className = "profile-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-label", "Open profile menu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML = '<svg class="profile-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3.5"></circle><path d="M4.5 20c.7-4 3.3-6 7.5-6s6.8 2 7.5 6"></path></svg>';

    dropdown.className = "profile-dropdown";
    profileLink.href = "/profile";
    profileLink.textContent = "My Profile";
    dashboardLink.href = "/dashboard";
    dashboardLink.textContent = "Dashboard";
    logoutButton.type = "button";
    logoutButton.textContent = "Logout";
    dropdown.append(profileLink, dashboardLink, logoutButton);
    menu.append(trigger, dropdown);
    slot.replaceWith(menu);

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = menu.classList.toggle("open");
      closeMenus();
      menu.classList.toggle("open", isOpen);
      trigger.setAttribute("aria-expanded", String(isOpen));
    });

    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      try {
        await fetch("/auth/mongo/logout", { method: "POST", credentials: "include" });
      } finally {
        window.location.assign("/login");
      }
    });
  };

  const loadNavigation = async () => {
    try {
      const response = await fetch("/auth/mongo/me", {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success || !payload.user) return;

      renderSharedLinks();
      authSlots.forEach((slot) => renderProfileMenu(slot));
      document.addEventListener("click", closeMenus);
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenus();
      });
    } catch {
      // Leave the normal Login link in place if the session check is unavailable.
    }
  };

  loadNavigation();
})();
