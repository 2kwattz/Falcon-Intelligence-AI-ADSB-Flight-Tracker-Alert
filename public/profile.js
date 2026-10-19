(() => {
  const $ = (selector) => document.querySelector(selector);
  const maximumPhotoSize = 5 * 1024 * 1024;
  const supportedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  let currentUser = null;
  let previewUrl = null;
  const escapeHtml = (value) => String(value ?? "—").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
  })[character]);

  const dateValue = (value, options) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Not provided" : new Intl.DateTimeFormat("en-GB", options).format(date);
  };

  const fullNameFor = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Falcon member";

  const safeProfilePictureUrl = (value) => {
    const url = String(value || "").trim();
    if (/^\/uploads\/profile-pictures\/profile-[a-f0-9-]+\.(jpg|png|webp)$/i.test(url)) return url;
    return /^https:\/\//i.test(url) ? url : "";
  };

  const renderAvatar = (user, sourceOverride = "") => {
    const avatar = $("#profile-avatar");
    const fullName = fullNameFor(user);
    const source = sourceOverride || safeProfilePictureUrl(user?.profilePicture);
    avatar.replaceChildren();

    if (!source) {
      avatar.textContent = fullName.charAt(0).toUpperCase();
      return;
    }

    const image = document.createElement("img");
    image.src = source;
    image.alt = `${fullName}'s profile photo`;
    image.addEventListener("error", () => {
      avatar.replaceChildren();
      avatar.textContent = fullName.charAt(0).toUpperCase();
    }, { once: true });
    avatar.append(image);
  };

  const renderProfile = (user) => {
    const fullName = fullNameFor(user);
    $("#profile-name").textContent = fullName;
    $("#profile-username").textContent = user.username ? `@${user.username}` : "";
    renderAvatar(user);
    $("#profile-details").innerHTML = [
      ["First name", user.firstName],
      ["Last name", user.lastName],
      ["Username", user.username ? `@${user.username}` : "Not provided"],
      ["Email", user.email],
      ["Date of birth", dateValue(user.dob, { day: "2-digit", month: "long", year: "numeric" })],
      ["Location", user.location || "Not provided"],
      ["Profile picture", user.profilePicture ? "Uploaded" : "Not uploaded"],
      ["Member since", dateValue(user.createdAt, { day: "2-digit", month: "long", year: "numeric" })]
    ].map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  };

  const photoStatus = (message = "", isError = false) => {
    const status = $("#profile-photo-status");
    status.textContent = message;
    status.classList.toggle("error", isError);
  };

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  };

  const loadProfile = async () => {
    try {
      const response = await fetch("/auth/mongo/me", { credentials: "include", headers: { Accept: "application/json" }, cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !payload.success || !payload.user) throw new Error(payload.message || "Unable to load your profile.");
      currentUser = payload.user;
      renderProfile(payload.user);
    } catch (error) {
      $("#profile-status").textContent = error.message || "Unable to load your profile.";
      $("#profile-status").classList.add("error");
    }
  };

  const photoForm = $("#profile-photo-form");
  const photoInput = $("#profile-picture-input");
  const photoSaveButton = $("#profile-photo-save");

  photoInput.addEventListener("change", () => {
    clearPreview();
    const [file] = photoInput.files || [];

    if (!file) {
      photoSaveButton.disabled = true;
      photoStatus("JPEG, PNG, or WebP · maximum 5 MB");
      if (currentUser) renderAvatar(currentUser);
      return;
    }

    if (!supportedPhotoTypes.has(file.type) || file.size > maximumPhotoSize) {
      photoInput.value = "";
      photoSaveButton.disabled = true;
      photoStatus("Choose a JPEG, PNG, or WebP image that is 5 MB or smaller.", true);
      if (currentUser) renderAvatar(currentUser);
      return;
    }

    previewUrl = URL.createObjectURL(file);
    if (currentUser) renderAvatar(currentUser, previewUrl);
    photoSaveButton.disabled = false;
    photoStatus(`${file.name} selected. Save photo to update your account.`);
  });

  photoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const [file] = photoInput.files || [];
    if (!file) return;

    photoSaveButton.disabled = true;
    photoStatus("Uploading profile photo…");

    try {
      const formData = new FormData();
      formData.append("profilePicture", file);
      const response = await fetch("/auth/mongo/profile/picture", {
        method: "PATCH",
        credentials: "include",
        body: formData,
        headers: { Accept: "application/json" }
      });
      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !payload.success || !payload.user) throw new Error(payload.message || "Unable to update your profile photo.");

      clearPreview();
      photoInput.value = "";
      currentUser = payload.user;
      renderProfile(currentUser);
      renderAvatar(currentUser, `${currentUser.profilePicture}?v=${Date.now()}`);
      photoStatus("Profile photo updated.");
    } catch (error) {
      photoSaveButton.disabled = false;
      photoStatus(error.message || "Unable to update your profile photo.", true);
    }
  });

  const menu = $(".menu-button");
  const links = $(".nav-links");
  menu.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
    menu.textContent = open ? "×" : "☰";
  });
  loadProfile();
})();
