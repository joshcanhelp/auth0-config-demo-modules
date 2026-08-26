// Stores PKCE state in sessionStorage and redirects to the Auth0 authorize endpoint.
(function () {
  const config = JSON.parse(document.getElementById("spa-login-config").textContent);

  sessionStorage.setItem("oauthState_" + config.clientId, config.state);
  sessionStorage.setItem("pkceVerifier_" + config.clientId, config.codeVerifier);

  const url = new URL("/authorize", "https://" + config.domain);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", config.state);
  url.searchParams.set("code_challenge", config.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  if (config.connection) {
    url.searchParams.set("connection", config.connection);
  }

  if (config.extraParams) {
    for (const [key, value] of Object.entries(config.extraParams)) {
      url.searchParams.set(key, value);
    }
  }

  window.location.replace(url.toString());
})();
