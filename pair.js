document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("pairing-form");
  const phoneInput = document.getElementById("phone");
  const codeElement = document.getElementById("pairing-code");
  const messageElement = document.getElementById("pairing-message");
  const statusElement = document.getElementById("pair-status");
  const statusDot = document.getElementById("pair-status-dot");
  const submitButton = document.getElementById("pair-submit");
  const logoutButton = document.getElementById("logout-session");
  const copyButton = document.getElementById("copy-pairing-code");

  if (!form || !window.PainSessionApi) return;

  let pollTimer = null;
  let active = false;
  let currentCode = "";

  function updateStatus(message, type = "waiting") {
    if (statusElement) {
      statusElement.textContent = message;
    }

    if (statusDot) {
      statusDot.className = `status-dot ${type}`;
    }
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
    }

    pollTimer = null;
    active = false;
  }

  function displayState(data) {
    const state =
      data.status || data.connectionState || "starting";

    updateStatus(
      window.PainSessionApi.statusLabel(state),
      state === "connected"
        ? "online"
        : ["failed", "logged_out", "ended"].includes(state)
          ? "error"
          : "waiting"
    );

    if (data.pairingCode && data.pairingCode !== currentCode) {
      currentCode = data.pairingCode;
      codeElement.textContent = currentCode;

      messageElement.textContent =
        "Enter this code in WhatsApp Linked Devices.";

      if (copyButton) {
        copyButton.hidden = false;
      }
    }

    if (state === "connected") {
      messageElement.textContent =
        "WhatsApp is connected. The bot can now run on the server.";

      submitButton.disabled = true;
      submitButton.textContent = "BOT CONNECTED";
    } else if (
      ["logged_out", "ended", "failed"].includes(state)
    ) {
      stopPolling();

      messageElement.textContent =
        "This session has ended. Start a new session to connect again.";

      submitButton.disabled = false;
      submitButton.textContent = "START NEW SESSION";
    }

    if (logoutButton) {
      logoutButton.hidden =
        !data.sessionExists ||
        ["logged_out", "ended"].includes(state);
    }
  }

  async function poll() {
    if (!active) return;

    try {
      const data = await window.PainSessionApi.current();
      displayState(data);
    } catch (error) {
      updateStatus(error.message, "error");

      // Ne pas supprimer une session pour une erreur réseau temporaire.
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const phone = phoneInput.value
      .trim()
      .replace(/[\s()+-]/g, "");

    if (!/^[0-9]{8,15}$/.test(phone)) {
      codeElement.textContent = "INVALID NUMBER";

      messageElement.textContent =
        "Enter a valid number with country code.";

      updateStatus("INVALID PHONE NUMBER", "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "STARTING SESSION...";

    codeElement.textContent = "--------";
    currentCode = "";

    if (copyButton) {
      copyButton.hidden = true;
    }

    messageElement.textContent =
      "Contacting the session service...";

    updateStatus("CREATING SESSION");

    try {
      const created =
        await window.PainSessionApi.create("pair");

      if (logoutButton) {
        logoutButton.hidden = false;
      }

      const result =
        await window.PainSessionApi.requestPairingCode(phone);

      if (result.pairingCode) {
        currentCode = result.pairingCode;
        codeElement.textContent = currentCode;

        messageElement.textContent =
          "Enter this code in WhatsApp Linked Devices.";

        if (copyButton) {
          copyButton.hidden = false;
        }
      }

      displayState({
        ...created,
        ...result,
        sessionExists: true
      });

      active = true;

      if (!pollTimer) {
        pollTimer = setInterval(poll, 2500);
      }

      await poll();

      if (submitButton.textContent !== "BOT CONNECTED") {
        submitButton.disabled = false;
        submitButton.textContent = "REQUEST NEW PAIRING CODE";
      }
    } catch (error) {
      codeElement.textContent = "ERROR";
      messageElement.textContent = error.message;

      updateStatus("REQUEST FAILED", "error");

      submitButton.disabled = false;
      submitButton.textContent = "TRY AGAIN";
    }
  });

  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      if (!currentCode) return;

      try {
        await navigator.clipboard.writeText(currentCode);
        messageElement.textContent = "Pairing code copied.";
      } catch (_) {
        messageElement.textContent =
          "Copy unavailable. Select and copy the code manually.";
      }
    });
  }

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

        currentCode = "";
        codeElement.textContent = "--------";

        if (copyButton) {
          copyButton.hidden = true;
        }

        messageElement.textContent =
          "The session has been logged out.";

        updateStatus("SESSION LOGGED OUT", "error");

        submitButton.disabled = false;
        submitButton.textContent = "START NEW SESSION";

        logoutButton.hidden = true;
      } catch (error) {
        updateStatus(error.message, "error");
      } finally {
        logoutButton.disabled = false;
      }
    });
  }

  // Restaurer l'état après rechargement.
  (async () => {
    try {
      const data = await window.PainSessionApi.current();

      if (data.sessionExists) {
        active = true;
        displayState(data);

        if (!pollTimer) {
          pollTimer = setInterval(poll, 2500);
        }
      }
    } catch (_) {
      updateStatus("READY TO START A SESSION");
    }
  })();
});
