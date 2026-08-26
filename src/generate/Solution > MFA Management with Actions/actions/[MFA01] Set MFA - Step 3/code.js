/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
  console.log(`[${event.transaction?.id ?? "<no TID>"}] Starting Set MFA Step 3...`);

  const { action = "" } = event.request.query;
  console.log(`[${event.transaction?.id ?? "<no TID>"}] action=${action}`);

  if (action.startsWith("set_mfa_")) {
    const [, , mfaType] = action.split("_");
    if (mfaType === "phone" || mfaType === "otp") {
      console.log(`[${event.transaction?.id ?? "<no TID>"}] Enrolling ${mfaType}...`);
      api.authentication.enrollWith({ type: mfaType });
    }
  }

  console.log(`[${event.transaction?.id ?? "<no TID>"}] Ended Set MFA Step 3`);
};
