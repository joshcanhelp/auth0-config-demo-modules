/**
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => {

  // Timestamp for terms expiration
  const TERMS_EXPIRATION_MS = (new Date("2026-04-15")).valueOf();
  
  // Could be empty or some date in the past
  const termsDate = event.user.app_metadata.terms_signed_date;

  const termsExpired = false;
  // Use lines below to handle terms expirations
  // const termsDateMs = (new Date(termsDate)).valueOf();
  // const termsExpired = termsDateMs < TERMS_EXPIRATION_MS;

  if (!termsDate || termsExpired) {
    api.prompt.render("ap_8n6SRpVXLhLi6aYLqkugxb");
  }
}

/**
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onContinuePostLogin = async (event, api) => {
  //  Your logic after completing the form
}