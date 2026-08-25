/**
* Handler that will be called during the execution of a PostLogin flow.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => {
  console.log(`[${event.transaction?.id ?? "<no TID>"}] Starting MFA Testing Action...`);

  const { action = "" } = event.request.query;

  if (action.startsWith("enroll_mfa_")) {
    const [,,mfaType] = action.split("_");
    console.log(`[${event.transaction?.id ?? "<no TID>"}] Enrolling ${mfaType}...`);
    api.authentication.enrollWith({type: mfaType});
    console.log(`[${event.transaction?.id ?? "<no TID>"}] Enrolling complete`);
  }
  
  if (action === "enroll_mfa") {
    console.log(`[${event.transaction?.id ?? "<no TID>"}] Enrolling any...`);
    api.authentication.enrollWithAny([
      {type: "otp"}, {type: "phone"}, {type: "recovery-code"}
    ]);
    console.log(`[${event.transaction?.id ?? "<no TID>"}] Enrolling complete`);
  }

  if (action.startsWith("challenge_mfa_")) {
    const [,,mfaType] = action.split("_");
    console.log(`[${event.transaction?.id ?? "<no TID>"}] Challenging ${mfaType}...`);
    api.authentication.challengeWith({type: mfaType});
    console.log(`[${event.transaction?.id ?? "<no TID>"}] Challenge complete`);
  }

  if (action === "challenge_mfa") {
    console.log(`[${event.transaction?.id ?? "<no TID>"}] Challenging any...`);
    api.authentication.challengeWithAny([
      {type: "otp"}, {type: "phone"}, {type: "recovery-code"}, {type: "email"}
    ]);
    console.log(`[${event.transaction?.id ?? "<no TID>"}] Challenge complete`);
  }

  console.log(`[${event.transaction?.id ?? "<no TID>"}] End of MFA Testing Action`);
};

