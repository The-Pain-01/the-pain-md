/* THE PAIN MD — frontend API client */
(() => {
  "use strict";

  const API_BASE = "/api/v1";
  const REQUEST_TIMEOUT_MS = 15000;

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: options.method || "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
          ...(options.headers || {})
        },
        body: options.body
          ? JSON.stringify(options.body)
          : undefined,
        signal: controller.signal
      });

      const contentType =
        response.headers.get("content-type") || "";

      const payload = contentType.includes("application/json")
        ? await response.json()
        : {};

      if (!response.ok) {
        const error = new Error(
          payload.message ||
          `Request failed (${response.status}).`
        );

        error.status = response.status;
        error.code = payload.code || "REQUEST_FAILED";

        throw error;
      }

      return payload;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(
          "The server took too long to respond. " +
          "Your WhatsApp session was not automatically deleted."
        );
      }

      if (error instanceof TypeError) {
        throw new Error(
          "Cannot reach the server. Check your connection. " +
          "Your active session is not automatically deleted."
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function create(method) {
    return request("/sessions", {
      method: "POST",
      body: { method }
    });
  }

  function current() {
    return request("/sessions/current");
  }

  function requestPairingCode(phone) {
    return request("/sessions/current/pairing-code", {
      method: "POST",
      body: { phone }
    });
  }

  function refreshQr() {
    return request("/sessions/current/qr/refresh", {
      method: "POST"
    });
  }

  function logout() {
    return request("/sessions/current/logout", {
      method: "POST"
    });
  }

  function statusLabel(status) {
    const labels = {
      starting: "STARTING SESSION",
      waiting_for_qr: "WAITING FOR QR CODE",
      qr_ready: "QR CODE READY",
      waiting_for_pairing: "WAITING FOR PAIRING",
      pairing_code_ready: "PAIRING CODE READY",
      connecting: "CONNECTING TO WHATSAPP",
      connected: "WHATSAPP CONNECTED — BOT ONLINE",
      reconnecting: "CONNECTION INTERRUPTED — RECONNECTING",
      logged_out: "SESSION LOGGED OUT",
      ended: "SESSION ENDED",
      failed: "CONNECTION FAILED"
    };

    return labels[status] || "SESSION STATUS";
  }

  window.PainSessionApi = {
    create,
    current,
    requestPairingCode,
    refreshQr,
    logout,
    statusLabel
  };
})();
