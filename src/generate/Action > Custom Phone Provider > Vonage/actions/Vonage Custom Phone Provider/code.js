/**
* Handler to be executed while sending a phone notification
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {CustomPhoneProviderAPI} api - Methods and utilities to help change the behavior of sending a phone notification.
*/
exports.onExecuteSendPhoneMessage = async (event, api) => {
  const response = await fetch("https://rest.nexmo.com/sms/json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: event.secrets.VONAGE_API_KEY,
      api_secret: event.secrets.VONAGE_API_SECRET,
      to: event.notification.recipient,
      from: event.secrets.FROM_PHONE_NUMBER,
      text: event.notification.as_text,
    }),
  });

  const data = await response.json();

  if (!data.messages || data.messages[0].status !== "0") {
    const errorText = data.messages?.[0]?.["error-text"] || "Unknown error";
    console.log("Vonage error:", JSON.stringify(data));
    throw new Error("Failed to send SMS via Vonage: " + errorText);
  }
};