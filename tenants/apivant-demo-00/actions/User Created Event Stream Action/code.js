/**
* Handler to be executed while processing events in an Event Stream.
* @param {Event} event - Details about the incoming event.
* @param {EventStreamAPI} api - Methods and utilities to define event stream processing.
*/
const { ManagementClient } = require("auth0");

exports.onExecuteEventStream = async (event, api) => {
  console.log(event.secrets);
  const { AUTH0_DOMAIN, MGMT_CLIENT_ID, MGMT_CLIENT_SECRET } = event.secrets;

  const user = event.message.data;

  if (user && !user.email_verified) {
    const management = new ManagementClient({
      domain: AUTH0_DOMAIN,
      clientId: MGMT_CLIENT_ID,
      clientSecret: MGMT_CLIENT_SECRET,
    });
    await management.jobs.verifyEmail({ body: { user_id: user.user_id } });
  }
};