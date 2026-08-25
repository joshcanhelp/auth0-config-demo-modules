exports.onExecutePreUserRegistration = async (event, api) => {
  console.log(`[${event.transaction?.id ?? "<no TID>"}] Pre-Registration started...`);

  console.log(`[${event.transaction?.id ?? "<no TID>"}] `, event.request.body);
  const email = event.user.email;
  let firstName = event.request.body['ulp-first-name'];
  let lastName = event.request.body['ulp-last-name'];
  const emailExists = event.request.body['ulp-email-exists'];

  if (!firstName || !lastName) {
    api.validation.error('registration_error', 'Missing fields!');
    return;
  }

  // TODO: What do do with this data? Update Auth0 profile?
  
  console.log(`[${event.transaction?.id ?? "<no TID>"}] Pre-Registration complete!`);
};