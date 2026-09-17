/**
 * Enforce PKCE for the Authorization Code flow.
 */
exports.onExecutePostLogin = async (event, api) => {
  // ONLY evaluate the Authorization Code flow.
  // This automatically returns early for Refresh Tokens, ROPC, Token Exchange, etc.
  if (event.transaction && event.transaction.protocol !== 'oidc-basic-profile') {
    return;
  }

  const query = event.request && event.request.query;
  const codeChallenge = query && query.code_challenge;

  if (!codeChallenge) {
    console.warn(`Blocked login missing PKCE code_challenge for Client ID: ${event.client.client_id}`);
    api.access.deny("Invalid authorization request. PKCE (code_challenge) is strictly required.");
  }
};