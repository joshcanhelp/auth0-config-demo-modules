/**
* Handler to be executed while processing events in an Event Stream.
* @param {Event} event - Details about the incoming event.
* @param {EventStreamAPI} api - Methods and utilities to define event stream processing.
*/
exports.onExecuteEventStream = async (event, api) => {
  const webhookUrl = event.secrets.SLACK_WEBHOOK_URL;

  const message = event.message;
  const fields = [
    { title: "Event ID", value: message.id || "n/a", short: true },
    { title: "Event Type", value: message.type || "n/a", short: true },
    { title: "Occurred At", value: message.occurred_at || "n/a", short: true },
    { title: "Tenant", value: event.tenant?.id || "n/a", short: true },
  ];

  if (message.data) {
    fields.push({
      title: "Data",
      value: "```" + JSON.stringify(message.data, null, 2) + "```",
      short: false,
    });
  }

  const body = JSON.stringify({
    attachments: [
      {
        color: "#36a64f",
        title: `Auth0 Event Stream: ${message.type || "unknown"}`,
        fields,
        footer: "Auth0 Event Stream Action",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  });

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
};