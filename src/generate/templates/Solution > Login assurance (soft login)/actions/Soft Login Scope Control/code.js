/**
 * Post-Login Action: Soft Login Assurance Control
 * Runs on both 'authorization_code' and 'refresh_token' grants.
 *
 * V3 approach: uses custom ACR claims to communicate assurance level
 * instead of removing scopes from the access token.
 */

// ACR claim values
const FULL_LOGIN_ACR = "urn:namespace:auth:acr:20";
const SOFT_LOGIN_ACR = "urn:namespace:auth:acr:10";
const ACR_CLAIM = "https://namespace.com/acr";

// Limit for full-assurnace tokens, assuming activity within the window defined below.
const MAX_FULL_SESSION_SECONDS = 4 * 60; // 4 minutes for prototype demo
// TODO: Remove line above, uncomment below
// const MAX_FULL_SESSION_SECONDS = 4 * 60 * 60; // 4 hours for production

// User must refresh or login within this window to received full-assurance tokens.
const MAX_IDLE_SECONDS = 2 * 60; // 2 minutes
// TODO: Remove line above, uncomment below
// const MAX_IDLE_SECONDS = 30 * 60; // 30 minutes for production

exports.onExecutePostLogin = async (event, api) => {
  const NOW_SECONDS = Math.floor(Date.now() / 1000);
  const logLine = (message) => {
    console.log(`[${event.transaction?.id ?? "<no TID>"}] ${message}`);
  };

  const setAssuranceHigh = () => {
    api.idToken.setCustomClaim(ACR_CLAIM, FULL_LOGIN_ACR);
    api.accessToken.setCustomClaim(ACR_CLAIM, FULL_LOGIN_ACR);
  };

  const setAssuranceLow = () => {
    api.idToken.setCustomClaim(ACR_CLAIM, SOFT_LOGIN_ACR);
    api.accessToken.setCustomClaim(ACR_CLAIM, SOFT_LOGIN_ACR);
  };

  logLine("=====================");
  logLine("Starting. Protocol: " + event.transaction.protocol);

  ///
  // Interactive login: store metadata and issue full assurance tokens
  const isUserLogin = event.transaction.protocol === "oidc-basic-profile";
  if (isUserLogin) {
    logLine("Running interactive login ...");

    api.refreshToken.setMetadata("lastInteractiveLoginAtSec", String(NOW_SECONDS));

    // Form field to enable soft login.
    const rememberMeBody = event.request.body["ulp-remember-me"] === "true";
    logLine("Remember Me selected: " + rememberMeBody);

    // Set this in the application metadata.
    const softLoginEnabled = event.client.metadata?.soft_login_enabled === "true";
    logLine("Soft Login enabled for this application: " + softLoginEnabled);

    const keepSignedIn = softLoginEnabled && rememberMeBody;
    logLine("Keep Signed In: " + keepSignedIn);

    api.refreshToken.setMetadata("keepSignedIn", keepSignedIn ? "true" : "false");

    // Always issue full assurance tokens on interactive login, even if "remember me" is not selected.
    setAssuranceHigh();

    return;
  }

  ///
  // Refresh token grant: check assurance window and set appropriate ACR claim
  const isRefreshGrant = event.transaction.protocol === "oauth2-refresh-token";
  if (isRefreshGrant) {
    logLine("Running refresh token flow ...");

    const {
      metadata: { keepSignedIn, lastInteractiveLoginAtSec } = {},
      last_exchanged_at: lastExchangedAt,
    } = event.refresh_token || {};

    const lastLoginInSeconds = parseInt(lastInteractiveLoginAtSec || "0", 10);
    if (!lastLoginInSeconds) {
      throw new Error("No record of interactive login time. Denying refresh.");
    }

    const secondsSinceLastLogin = NOW_SECONDS - lastLoginInSeconds;
    const withinFullSessionWindow = secondsSinceLastLogin < MAX_FULL_SESSION_SECONDS;
    const lastRefreshInSeconds = Math.floor(
      new Date(lastExchangedAt || 0).getTime() / 1000
    );
    const lastActivityInSeconds = Math.max(lastLoginInSeconds, lastRefreshInSeconds);
    const secondsSinceLastActivity = NOW_SECONDS - lastActivityInSeconds;
    const withinActivityWindow = secondsSinceLastActivity < MAX_IDLE_SECONDS;

    if (withinFullSessionWindow && withinActivityWindow) {
      logLine("Within full session and activity window, issuing full assurance tokens");
      setAssuranceHigh();
      return;
    }

    if (keepSignedIn === "true") {
      logLine("Setting low assurance level claims because keepSignedIn is true.");
      setAssuranceLow();
      return;
    }

    // This should never be reached because the RT expirations should stop refresh.
    logLine("Skipping assurance level claims.");
  }
};
