// Handles the change-password-link page for SPA/native clients with a BFF.
// POSTs the user_id from localStorage to the server route, which uses the BFF
// client credentials to create a Management API password change ticket.
(function () {
  const config = JSON.parse(
    document.getElementById("change-password-link-config").textContent
  );
  const statusEl = document.getElementById("status");
  const stepsEl = document.getElementById("steps");
  const ticketSection = document.getElementById("ticket-section");

  function addStep(label, success, detail) {
    const el = document.createElement("p");
    el.style.color = success ? "#1a7f37" : "#cf222e";
    el.textContent =
      (success ? "\u2713 " : "\u2717 ") + label + (detail ? ": " + detail : "");
    stepsEl.appendChild(el);
  }

  const userId = localStorage.getItem("auth0_user_id");

  if (!userId) {
    statusEl.innerHTML =
      'No user found. <a href="/login/' + config.clientId + '">Please login</a> first.';
    return;
  }

  statusEl.textContent = "Creating password change link...";

  async function run() {
    let result;
    try {
      const response = await fetch(window.location.pathname, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      result = await response.json();
    } catch (err) {
      statusEl.textContent = "Error: " + String(err);
      statusEl.style.color = "#cf222e";
      return;
    }

    statusEl.textContent = "";

    for (const step of result.steps) {
      addStep(step.label, step.success, step.detail);
    }

    if (result.ticket) {
      ticketSection.innerHTML =
        '<div class="ticket-link"><strong>Password change link:</strong><br>' +
        '<a href="' +
        result.ticket +
        '">' +
        result.ticket +
        "</a></div>";
    }
  }

  run();
})();
