
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("pairing-form");
  const phoneInput = document.getElementById("phone");
  const codeElement = document.getElementById("pairing-code");
  const messageElement = document.getElementById("pairing-message");
  const statusElement = document.getElementById("pair-status");
  const statusDot = document.getElementById("pair-status-dot");
  const submitButton = document.getElementById("pair-submit");

  if (!form) return;

  // À remplacer par l'URL réelle du backend lors de son intégration.
  const API_BASE = window.PAIN_API_URL || "";

  function updateStatus(message, type = "waiting") {
    if (statusElement) statusElement.textContent = message;
    if (statusDot) statusDot.className = "status-dot " + type;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const phone = phoneInput.value.trim().replace(/[\s()+-]/g, "");

    if (!/^[0-9]{8,15}$/.test(phone)) {
      codeElement.textContent = "INVALID NUMBER";
      messageElement.textContent = "Enter a valid number with country code.";
      updateStatus("INVALID PHONE NUMBER", "error");
      return;
    }

    if (!API_BASE) {
      codeElement.textContent = "NOT AVAILABLE";
      messageElement.textContent = "The backend is not connected yet.";
      updateStatus("BACKEND NOT CONNECTED", "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "REQUESTING CODE...";
    codeElement.textContent = "--------";
    messageElement.textContent = "Contacting the connection service...";
    updateStatus("REQUESTING PAIRING CODE");

    try {
      const response = await fetch(`${API_BASE}/api/session/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Pairing request failed.");
      }

      if (!data.code || typeof data.code !== "string") {
        throw new Error("The backend did not return a pairing code.");
      }

      codeElement.textContent = data.code;
      messageElement.textContent = "Enter this code in WhatsApp Linked Devices.";
      updateStatus("PAIRING CODE RECEIVED", "online");
    } catch (error) {
      codeElement.textContent = "ERROR";
      messageElement.textContent = error.message || "Unable to generate the code.";
      updateStatus("REQUEST FAILED", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "GENERATE PAIRING CODE";
    }
  });
});
