document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("generate-qr");
  const container = document.getElementById("qr-container");
  const status = document.getElementById("qr-status");
  const dot = document.getElementById("qr-status-dot");
  const logoutButton = document.getElementById("logout-session");

  if (!button || !container || !status || !window.PainSessionApi) {
    return;
  }

  let pollTimer = null;
  let active = false;
  let lastQr = "";

  function showStatus(message, type = "waiting") {
    status.textContent = message;

    if (dot) {
      dot.className = `status-dot ${type}`;
    }
  }

  function showPlaceholder(message) {
    container.replaceChildren();

    const label = document.createElement("span");
    label.textContent = "QR";

    const small = document.createElement("small");
    small.textContent = message;

    container.append(label, small);
    lastQr = "";
  }

  function showQr(dataUrl) {
    if (!dataUrl || dataUrl === lastQr) return;

    if (!/^data:image\/(png|jpeg|webp);base64,/i.test(dataUrl)) {
      throw new Error("The server returned an invalid QR image.");
    }

    const image = document.createElement("img");

    image.className = "qr-image";
    image.alt = "WhatsApp device-linking QR code";
    image.src = dataUrl;

    container.replaceChildren(image);
    lastQr = dataUrl;
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
    }

    pollTimer = null;
    active = false;
  }

  async function refreshStatus() {
    if (!active) return;

    try {
      const data = await window.PainSessionApi.current();
      const state = data.status || data.connectionState || "starting";

      if (data.qrDataUrl) {
        showQr(data.qrDataUrl);
      }

      showStatus(
        window.PainSessionApi.statusLabel(state),
        state === "connected"
          ? "online"
          : ["failed", "logged_out", "ended"].includes(state)
            ? "error"
            : "waiting"
      );

      if (logoutButton) {
        logoutButton.hidden =
          !data.sessionExists ||
          ["logged_out", "ended"].includes(state);
      }

      if (state === "connected") {
        button.disabled = true;
        button.textContent = "BOT CONNECTED";
      } else if (
        ["logged_out", "ended", "failed"].includes(state)
      ) {
        stopPolling();
        button.disabled = false;
        button.textContent = "START NEW SESSION";
      } else {
        button.disabled = false;
        button.textContent = "REFRESH QR CODE";
      }
    } catch (error) {
      showStatus(error.message, "error");

      // Une erreur réseau temporaire ne supprime jamais la session.
    }
  }

  async function startSession() {
    button.disabled = true;
    button.textContent = "STARTING SESSION...";

    showStatus("CONTACTING SESSION SERVICE");
    showPlaceholder("GENERATING QR CODE");

    try {
      const data = await window.PainSessionApi.create("qr");

      if (data.qrDataUrl) {
        showQr(data.qrDataUrl);
      }

      showStatus(
        window.PainSessionApi.statusLabel(
          data.status || "waiting_for_qr"
        )
      );

      if (logoutButton) {
        logoutButton.hidden = false;
      }

      active = true;

      await refreshStatus();

      if (!pollTimer) {
        pollTimer = setInterval(refreshStatus, 2500);
      }

      button.textContent = "REFRESH QR CODE";
      button.disabled = false;
    } catch (error) {
      showStatus(error.message, "error");
      showPlaceholder("QR CODE NOT AVAILABLE");

      button.textContent = "TRY AGAIN";
      button.disabled = false;
    }
  }

  button.addEventListener("click", async () => {
    if (!active) {
      return startSession();
    }

    button.disabled = true;

    try {
      const data = await window.PainSessionApi.refreshQr();

      if (data.qrDataUrl) {
        showQr(data.qrDataUrl);
      }

      showStatus("QR CODE REFRESHED");
    } catch (error) {
      showStatus(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      const confirmed = window.confirm(
        "Log out this WhatsApp session? " +
        "The bot will stop and its authentication data will be deleted."
      );

      if (!confirmed) return;

      logoutButton.disabled = true;

      try {
        await window.PainSessionApi.logout();

        stopPolling();
        showPlaceholder("SESSION LOGGED OUT");
        showStatus("SESSION LOGGED OUT", "error");

        button.disabled = false;
        button.textContent = "START NEW SESSION";
        logoutButton.hidden = true;
      } catch (error) {
        showStatus(error.message, "error");
        logoutButton.disabled = false;
      }
    });
  }

  // Récupération de la session après rechargement de la page.
  (async () => {
    try {
      const data = await window.PainSessionApi.current();

      if (data.sessionExists) {
        active = true;

        if (data.qrDataUrl) {
          showQr(data.qrDataUrl);
        }

        if (logoutButton) {
          logoutButton.hidden = false;
        }

        await refreshStatus();

        pollTimer = setInterval(refreshStatus, 2500);
      }
    } catch (_) {
      showStatus("READY TO START A SESSION");
    }
  })();
});
