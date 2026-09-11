/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
  console.log(`[${event.transaction?.id ?? "<no TID>"}] Starting Change Email Action...`);

  const { action = "" } = event.request.query;

  if (action === "change_email") {
    console.log(`[${event.transaction?.id ?? "<no TID>"}] Render Change Email Form...`);
    api.prompt.render("ap_74tke1d229tTLRypBsNGPv");
  }
};

/**
 * Handler that will be invoked when this action is resuming after an external redirect. If your
 * onExecutePostLogin function does not perform a redirect, this function can be safely ignored.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onContinuePostLogin = async (event, api) => {
  console.log(
    `[${event.transaction?.id ?? "<no TID>"}] Back from Change Email Action...`
  );
};
