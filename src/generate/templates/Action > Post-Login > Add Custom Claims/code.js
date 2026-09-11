/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
  console.log(`[${event.transaction?.id ?? "<no TID>"}] Setting custom claims...`);

  ////
  /// Set ID token claims
  /// https://auth0.com/docs/actions/reference/post-login/post-login-api-object#api-idtoken-setcustomclaim-key-value
  //

  api.idToken.setCustomClaim("app_metadata_claim", event.user.app_metadata.claim);

  // Add phone_verified claim to ID token if the client has requested the phone scope and the user has a phone number.
  const scopes = (event.transaction || {}).requested_scopes;
  if (Array.isArray(scopes) && scopes.includes("phone") && event.user.phone) {
    api.idToken.setCustomClaim("phone_number_verified", !!event.user.phone_verified);
  }

  ////
  /// Set access token claims
  /// https://auth0.com/docs/actions/reference/post-login/post-login-api-object#api-accesstoken-setcustomclaim-key-value
  //

  api.accessToken.setCustomClaim("app_metadata_claim", event.user.app_metadata.claim);

  console.log(`[${event.transaction?.id ?? "<no TID>"}] Finished setting custom claims!`);
};
