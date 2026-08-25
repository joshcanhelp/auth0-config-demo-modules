/**
* Handler that will be called during the execution of a PostLogin flow.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => {
  console.log(`[${event.transaction?.id ?? "<no TID>"}] Starting Set MFA Step 1...`);

  const { action = "" } = event.request.query;
  console.log(`[${event.transaction?.id ?? "<no TID>"}] action=${action}`);

  const factors = (event.user.enrolledFactors || []).map(factor => factor.type);
  console.log(`[${event.transaction?.id ?? "<no TID>"}] Enrolled factors: ${factors}`);

  // We need to challenge with MFA if the user has opted in or 
  // if we're making changes to MFA.
  const challengeWith = event.user.app_metadata.mfa_challenge_factor || (
    (action === "set_mfa_email" && factors.includes("email")) ? "email" : null
  );

  if (challengeWith) {
    console.log(`[${event.transaction?.id ?? "<no TID>"}] Challenging with ${challengeWith}...`);
    api.authentication.challengeWith({type: challengeWith});
  }

  console.log(`[${event.transaction?.id ?? "<no TID>"}] Ended Set MFA Step 1`);
};

