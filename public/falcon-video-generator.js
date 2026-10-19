(() => {
  const maxFileSize = 20 * 1024 * 1024;
  const maxFiles = 5;
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  const $ = (selector) => document.querySelector(selector);
  const fileInput = $("#reference-images");
  const uploadList = $("#upload-list");
  const uploadLimit = $("#upload-limit");
  const dropzone = $("#upload-dropzone");
  const formStatus = $("#video-form-status");
  const prompt = $("#video-prompt");
  const promptCount = $("#prompt-count");
  const form = $("#video-generator-form");
  const generateButton = $("#generate-video-button");
  const previewDialog = $("#image-preview-dialog");
  const previewImage = $("#image-preview");
  const uploadedItems = [];
  let activeUploads = 0;

  const formatBytes = (value) => value < 1024 * 1024
    ? `${Math.max(1, Math.round(value / 1024))} KB`
    : `${(value / (1024 * 1024)).toFixed(1)} MB`;

  function setStatus(message, tone = "") {
    formStatus.textContent = message;
    formStatus.className = `form-status${tone ? ` ${tone}` : ""}`;
  }

  function updateUploadLimit() {
    uploadLimit.textContent = `${uploadedItems.length} / ${maxFiles} added`;
    fileInput.disabled = uploadedItems.length >= maxFiles;
    dropzone.classList.toggle("disabled", fileInput.disabled);
  }

  function clearFailedUploads() {
    for (let index = uploadedItems.length - 1; index >= 0; index -= 1) {
      const item = uploadedItems[index];
      if (item.state !== "failed") continue;
      removeItemFromList(item);
    }
  }

  function removeItemFromList(item) {
    const index = uploadedItems.indexOf(item);
    if (index === -1) return;
    if (previewImage.src === item.objectUrl) {
      previewDialog.close();
      previewImage.removeAttribute("src");
    }
    URL.revokeObjectURL(item.objectUrl);
    item.element.remove();
    uploadedItems.splice(index, 1);
    updateUploadLimit();
  }

  function createUploadItem(file) {
    const objectUrl = URL.createObjectURL(file);
    const element = document.createElement("article");
    element.className = "upload-item";
    element.innerHTML = `
      <img src="${objectUrl}" alt="">
      <div class="upload-item-info">
        <p class="upload-item-name"></p>
        <div class="upload-item-status"><span class="upload-progress"><span></span></span><span class="upload-message">Preparing upload…</span></div>
      </div>
      <div class="upload-item-actions">
        <button class="preview-button" type="button" disabled>Preview</button>
        <button class="remove-button" type="button" disabled>Remove</button>
      </div>`;
    element.querySelector(".upload-item-name").textContent = file.name;
    const item = {
      file,
      objectUrl,
      element,
      state: "uploading",
      previewButton: element.querySelector(".preview-button"),
      removeButton: element.querySelector(".remove-button")
    };
    item.previewButton.addEventListener("click", () => {
      previewImage.src = item.objectUrl;
      previewImage.alt = `${file.name} preview`;
      previewDialog.showModal();
    });
    item.removeButton.addEventListener("click", () => removeUploadedImage(item));
    uploadList.append(element);
    return item;
  }

  function markItem(item, state, message) {
    item.state = state;
    const element = item.element;
    element.classList.toggle("complete", state === "complete");
    element.classList.toggle("failed", state === "failed");
    element.classList.toggle("removing", state === "removing");
    element.querySelector(".upload-message").textContent = message;
    item.previewButton.disabled = state !== "complete";
    item.removeButton.disabled = state === "uploading" || state === "removing";
  }

  async function removeUploadedImage(item) {
    if (item.state === "uploading" || item.state === "removing") return;

    if (item.state !== "complete" || !item.serverFilename) {
      removeItemFromList(item);
      setStatus("Reference image removed.", "success");
      return;
    }

    markItem(item, "removing", "Removing image…");
    try {
      const response = await fetch(`/api/ai-video/upload/${encodeURIComponent(item.serverFilename)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" }
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !payload.status) throw new Error(payload.message || "Could not remove the image.");

      removeItemFromList(item);
      setStatus(payload.message, "success");
    } catch (error) {
      markItem(item, "complete", error.message);
      setStatus(error.message, "error");
    }
  }

  function uploadFile(item) {
    return new Promise((resolve) => {
      const payload = new FormData();
      payload.append("referenceImages", item.file);
      const request = new XMLHttpRequest();
      request.open("POST", "/api/ai-video/upload");
      request.responseType = "json";
      request.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return;
        item.element.querySelector(".upload-progress > span").style.width = `${Math.round((event.loaded / event.total) * 100)}%`;
        item.element.querySelector(".upload-message").textContent = `Uploading ${Math.round((event.loaded / event.total) * 100)}%`;
      });
      request.addEventListener("load", () => {
        const response = request.response || {};
        if (request.status === 401) {
          window.location.assign("/login");
          markItem(item, "failed", "Sign in is required to upload images");
          resolve();
          return;
        }
        if (request.status >= 200 && request.status < 300 && response.status) {
          const uploadedFile = response.files && response.files[0];
          if (uploadedFile && uploadedFile.filename) {
            item.serverFilename = uploadedFile.filename;
            markItem(item, "complete", "Uploaded · Preview available");
          } else {
            markItem(item, "failed", "Upload response was incomplete");
          }
        } else {
          markItem(item, "failed", response.message || "Upload failed");
        }
        resolve();
      });
      request.addEventListener("error", () => {
        markItem(item, "failed", "Network error — try selecting the image again");
        resolve();
      });
      request.send(payload);
    });
  }

  async function addFiles(fileList) {
    clearFailedUploads();
    const slotsAvailable = maxFiles - uploadedItems.length;
    const files = Array.from(fileList).slice(0, slotsAvailable);
    if (!files.length) return;
    if (fileList.length > slotsAvailable) setStatus(`Only ${slotsAvailable} more image${slotsAvailable === 1 ? "" : "s"} can be added.`, "error");

    const validFiles = [];
    for (const file of files) {
      if (!allowedTypes.has(file.type)) {
        setStatus(`${file.name} is not a supported image type.`, "error");
      } else if (file.size > maxFileSize) {
        setStatus(`${file.name} is larger than the 20 MB limit.`, "error");
      } else {
        validFiles.push(file);
      }
    }

    const items = validFiles.map((file) => {
      const item = createUploadItem(file);
      uploadedItems.push(item);
      return item;
    });
    updateUploadLimit();
    activeUploads += items.length;
    if (items.length) setStatus("Uploading reference image…");
    await Promise.all(items.map(uploadFile));
    activeUploads -= items.length;
    const failed = items.filter((item) => item.state === "failed").length;
    if (failed) setStatus(`${failed} image upload${failed === 1 ? "" : "s"} failed. Choose those images again to retry.`, "error");
    else if (items.length) setStatus("Reference images uploaded. Add your prompt when you are ready.", "success");
  }

  prompt.addEventListener("input", () => {
    promptCount.textContent = `${prompt.value.length} / 2000`;
  });
  fileInput.addEventListener("change", async () => {
    await addFiles(fileInput.files);
    fileInput.value = "";
  });
  ["dragenter", "dragover"].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    if (!fileInput.disabled) dropzone.classList.add("is-dragover");
  }));
  ["dragleave", "drop"].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragover");
  }));
  dropzone.addEventListener("drop", async (event) => {
    if (!fileInput.disabled) await addFiles(event.dataTransfer.files);
  });

  $("#image-preview-close").addEventListener("click", () => previewDialog.close());
  previewDialog.addEventListener("click", (event) => {
    if (event.target === previewDialog) previewDialog.close();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!prompt.value.trim()) {
      setStatus("Add a video prompt before generating.", "error");
      prompt.focus();
      return;
    }
    if (activeUploads) {
      setStatus("Please wait for the reference images to finish uploading.", "error");
      return;
    }
    if (uploadedItems.some((item) => item.state === "removing")) {
      setStatus("Please wait for the image removal to finish.", "error");
      return;
    }
    if (uploadedItems.some((item) => item.state === "failed")) {
      setStatus("Upload the failed reference images again before generating.", "error");
      return;
    }
    generateButton.disabled = true;
    setStatus("Authorizing video request…");
    try {
      const referenceImages = uploadedItems
        .filter((item) => item.state === "complete" && item.serverFilename)
        .map((item) => item.serverFilename);
      const response = await fetch("/api/ai-video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt: prompt.value.trim(),
          model: $("#video-model").value,
          referenceImages
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok || !payload.status) throw new Error(payload.message || "Could not authorize the video request.");

      setStatus(payload.message, "success");
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      generateButton.disabled = false;
    }
  });

  window.addEventListener("DOMContentLoaded", () => {
    const menuButton = $("#video-menu-button");
    const navLinks = $("#video-nav-links");
    menuButton.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.textContent = open ? "×" : "☰";
    });
    navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.textContent = "☰";
    }));
  });
})();
