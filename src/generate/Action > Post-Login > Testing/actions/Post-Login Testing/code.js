/**
* Handler that will be called during the execution of a PostLogin flow.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => {
  console.log(`[${event.transaction?.id ?? "<no TID>"}] Post-Login testing started...`);

  console.log(`[${event.transaction?.id ?? "<no TID>"}] Query params...`);
  console.log(event.request.query);

  console.log(`[${event.transaction?.id ?? "<no TID>"}] Body object...`);
  console.log(event.request.body);

  console.log(`[${event.transaction?.id ?? "<no TID>"}] Authentication...`);
  console.log(event.authentication);

  console.log(`[${event.transaction?.id ?? "<no TID>"}] Transaction...`);
  console.log(event.transaction);

  console.log(`[${event.transaction?.id ?? "<no TID>"}] Redering Form...`);
  api.prompt.render("FORM_ID"); 

  console.log(`[${event.transaction?.id ?? "<no TID>"}] Post-Login testing complete!`);
};
