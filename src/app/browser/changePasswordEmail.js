// Handles the change-password-email page for SPA/native clients.
// Reads the user email from localStorage and calls the Auth0 change password API.
(function () {
  const config = JSON.parse(
    document.getElementById("change-password-config").textContent
  );
  const statusEl = document.getElementById("status");
  const actionSection = document.getElementById("action-section");

  const userEmail = localStorage.getItem("auth0_user_email");

  if (!userEmail) {
    statusEl.innerHTML =
      'No user found. <a href="/login/' + config.clientId + '">Please login</a> first.';
    return;
  }

  document.getElementById("user-email-display").textContent = userEmail;
  actionSection.style.display = "";

  document
    .getElementById("change-password-btn")
    .addEventListener("click", async function () {
      this.disabled = true;
      statusEl.textContent = "Sending change password email...";
      statusEl.style.color = "";

      try {
        const response = await fetch(
          "https://" + config.auth0Domain + "/dbconnections/change_password",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: config.clientId,
              email: userEmail,
              connection: config.connection,
            }),
          }
        );

        if (response.ok) {
          statusEl.textContent =
            "Password change email sent to " + userEmail + ". Check your inbox.";
          statusEl.style.color = "#1a7f37";
        } else {
          const msg = await response.text();
          statusEl.textContent = "Failed to send email: " + msg;
          statusEl.style.color = "#cf222e";
          this.disabled = false;
        }
      } catch (err) {
        statusEl.textContent = "Error: " + String(err);
        statusEl.style.color = "#cf222e";
        this.disabled = false;
      }
    });
})();
