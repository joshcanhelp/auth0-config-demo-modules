/**
* Handler that will be called during the execution of a PostLogin flow.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => {
  console.log(`[${event.transaction?.id ?? "<no TID>"}] Start MFA Step 4 Action...`);

  const { action } = event.request.query;
  console.log(`[${event.transaction?.id ?? "<no TID>"}] action=${action}`);

  if (action && action.startsWith("set_mfa_")) {
    const factors = (event.user.enrolledFactors || []).map(factor => factor.type)
    console.log(`[${event.transaction?.id ?? "<no TID>"}] Factors: ${factors}`);

    const [,,mfaType] = action.split("_");
    if (mfaType !== "none" && !factors.includes(mfaType)) {
      throw new Error(`User's enrolled factors do not include ${mfaType}`);
    }

    api.user.setAppMetadata("mfa_challenge_factor", mfaType === "none" ? null : mfaType);
  }

  console.log(`[${event.transaction?.id ?? "<no TID>"}] End MFA Step 4 Action`);
};

