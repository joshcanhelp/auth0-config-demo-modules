// Handles the OAuth callback in the browser for SPA clients.
// Renders each step with success/error colors, then displays tokens.
(function () {
  const config = JSON.parse(document.getElementById("spa-callback-config").textContent);
  const stepsEl = document.getElementById("steps");
  const tokensEl = document.getElementById("tokens");

  function addStep(label, success, detail) {
    const el = document.createElement("p");
    el.style.color = success ? "#1a7f37" : "#cf222e";
    el.style.margin = "0.25rem 0";
    const marker = success ? "\u2713 " : "\u2717 ";
    el.textContent = marker + label + (detail ? ": " + detail : "");
    stepsEl.appendChild(el);
  }

  function decodeJwtPayload(token) {
    const part = token.split(".")[1];
    if (!part) return null;
    try {
      return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
      return null;
    }
  }

  function renderTokens(tokenResponse) {
    const idClaims = tokenResponse.id_token
      ? decodeJwtPayload(tokenResponse.id_token)
      : null;
    const atParts = tokenResponse.access_token
      ? tokenResponse.access_token.split(".")
      : [];
    const atClaims =
      atParts.length === 3 ? decodeJwtPayload(tokenResponse.access_token) : null;

    let html = "<hr>";
    if (idClaims) {
      html +=
        "<h2>ID Token Claims</h2><pre>" + JSON.stringify(idClaims, null, 2) + "</pre>";
    }
    if (atClaims) {
      html +=
        "<h2>Access Token Claims</h2><pre>" +
        JSON.stringify(atClaims, null, 2) +
        "</pre>";
    }
    html +=
      "<h2>Token Response</h2><pre>" + JSON.stringify(tokenResponse, null, 2) + "</pre>";
    tokensEl.innerHTML = html;
  }

  async function run() {
    // Step 1: Parse callback parameters
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const errorDesc = params.get("error_description");
    const code = params.get("code");
    const state = params.get("state");

    if (error) {
      addStep(
        "Parse callback parameters",
        false,
        error + (errorDesc ? " - " + errorDesc : "")
      );
      return;
    }
    if (!code || !state) {
      addStep("Parse callback parameters", false, "Missing code or state in URL");
      return;
    }
    addStep("Parse callback parameters", true);

    // Step 2: Validate state
    const storedState = sessionStorage.getItem("oauthState_" + config.clientId);
    sessionStorage.removeItem("oauthState_" + config.clientId);
    if (!storedState || state !== storedState) {
      addStep("Validate state", false, "State mismatch - possible CSRF");
      return;
    }
    addStep("Validate state", true);

    // Step 3: Read PKCE verifier
    const codeVerifier = sessionStorage.getItem("pkceVerifier_" + config.clientId);
    sessionStorage.removeItem("pkceVerifier_" + config.clientId);

    // Step 4: Exchange code for tokens
    let tokenResponse;
    try {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: config.clientId,
        code: code,
        redirect_uri: config.redirectUri,
      });
      if (codeVerifier) {
        body.set("code_verifier", codeVerifier);
      }
      const response = await fetch("https://" + config.auth0Domain + "/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body,
      });
      tokenResponse = await response.json();
      if (!response.ok) {
        const msg =
          tokenResponse.error_description ||
          tokenResponse.error ||
          "HTTP " + response.status;
        addStep("Exchange code for tokens", false, msg);
        return;
      }
      addStep("Exchange code for tokens", true);
    } catch (err) {
      addStep("Exchange code for tokens", false, String(err));
      return;
    }

    // Step 5: Decode and display tokens
    try {
      renderTokens(tokenResponse);
      addStep("Decode and display tokens", true);
    } catch (err) {
      addStep("Decode and display tokens", false, String(err));
    }
  }

  run();
})();
