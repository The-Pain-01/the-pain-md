
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("generate-qr");
  const container = document.getElementById("qr-container");
  const status = document.getElementById("qr-status");
  const dot = document.getElementById("qr-status-dot");

  if (!button || !container || !status) return;

  // À remplacer par l'URL réelle du backend lors de son intégration.
  const API_BASE = window.PAIN_API_URL || "";

  function showStatus(message, type = "waiting") {
    status.textContent = message;
    if (dot) dot.className = "status-dot " + type;
  }

  function showPlaceholder(message) {
    container.replaceChildren();

    const label = document.createElement("span");
    label.textContent = "QR";

    const small = document.createElement("small");
    small.textContent = message;

    container.append(label, small);
  }

  button.addEventListener("click", async () => {
    if (!API_BASE) {
      showStatus("BACKEND NOT CONNECTED", "error");
      showPlaceholder("BACKEND NOT CONNECTED");
      return;
    }

    button.disabled = true;
    button.textContent = "REQUESTING QR CODE...";
    showStatus("REQUESTING QR CODE");

    try {
      const response = await fetch(`${API_BASE}/api/session/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "QR request failed.");
      }

      // Le backend doit renvoyer une image QR sous forme de data URL.
      if (!data.qrDataURL || !data.qrDataURL.startsWith("data:image/")) {
        throw new Error("The backend did not return a valid QR image.");
      }

      const image = document.createElement("img");
      image.className = "qr-image";
      image.alt = "WhatsApp connection QR Code";
      image.src = data.qrDataURL;

      container.replaceChildren(image);
      showStatus("QR CODE READY", "online");
      button.textContent = "REFRESH QR CODE";
    } catch (error) {
      showPlaceholder("QR CODE UNAVAILABLE");
      showStatus(error.message || "CONNECTION ERROR", "error");
      button.textContent = "TRY AGAIN";
    } finally {
      button.disabled = false;
    }
  });
});
