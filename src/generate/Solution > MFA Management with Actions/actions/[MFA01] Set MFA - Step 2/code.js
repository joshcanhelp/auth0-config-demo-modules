/**
* Handler that will be called during the execution of a PostLogin flow.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => {
  console.log(`[${event.transaction?.id ?? "<no TID>"}] Starting Set MFA Step 2...`);

  const { action } = event.request.query;
  console.log(`[${event.transaction?.id ?? "<no TID>"}] action=${action}`);

  const shouldDeleteMfa = (event.user.enrolledFactors || []).some((factor) => {
    return factor.type === "otp" || factor.type === "phone"
  });

  if (action && action.startsWith("set_mfa_") && shouldDeleteMfa) {
    console.log(`[${event.transaction?.id ?? "<no TID>"}] Rendering delete MFA form`);
    api.prompt.render('ap_coQWorfcN4FbrcjuV1zxmH');
  }

  console.log(`[${event.transaction?.id ?? "<no TID>"}] Ended Set MFA Step 2`);
};

exports.onContinuePostLogin = async (event, api) => {
}

