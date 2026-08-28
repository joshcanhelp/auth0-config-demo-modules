# Self-Service Factor Management

Starting off, someone will not have MFA but will have an email. That email will also be verified because they will need to set their password via emailed link before they can access the application.

The portion of the user profile we’re concerned with is:

```json
{
  "enrolled_mfa_factors": ["email"],
  "mfa_challenge_factor": null,
  "email": "person@example.com",
  "email_verified": true
}
```

Now someone chooses to turn on email MFA. The job to be done here is to make sure the email is verified and set a metadata flag to indicate that the user wants to use email MFA on login.

In this case (and the remaining scenarios), we’re going to send the user to the [Auth0 authorization endpoint](https://auth0.com/docs/api/authentication/login/authenticate-using-database) with a custom URL parameter that is picked up by a [post-login Action](https://auth0.com/docs/customize/actions/explore-triggers/signup-and-login-triggers/login-trigger/post-login-event-object). The code block below describes what the Action will do in pseudo-code. The challenge event will be handled by the Actions `api.authentication` object, [as described here](https://auth0.com/docs/secure/multi-factor-authentication/customize-mfa/customize-mfa-selection-universal-login#sequenced-and-contextual-flows).

```jsx
///
// URL parameter "set_mfa_email"

// Step 1
exports.onExecutePostLogin = async (event, api) => {
  // Look for existing factors
  // Challenge with existing verified email
};

// Step 2
exports.onExecutePostLogin = async (event, api) => {
  // Look for existing app OTP or phone factors
  // No existing factors to delete
};

// Step 3
exports.onExecutePostLogin = async (event, api) => {
  // Nothing to enroll, email is ready for MFA
};

// Step 4
exports.onExecutePostLogin = async (event, api) => {
  // Verify the user has the factor
  // Email is verified so it appears in the list

  // Set metadata flag
  api.user.setAppMetadata("mfa_challenge_factor", "email");
};
```

Note the separate Actions here are to account for the challenge and enroll processes. We could add the flag all in one place for email but we want to avoid duplicate logic in the Actions pipeline where possible. See the phone enrollment code block for additional explanation.

Resulting user:

```json
{
  "enrolled_mfa_factors": ["email"],
  "mfa_challenge_factor": "email",
  "email": "person@example.com",
  "email_verified": true
}
```

You can see the new `mfa_challenge_factor` property, which tells your application that the user has activated email MFA and will allow you to build UI around that state.

Now, after reading an article about the security implications of using email as a second factor to a password, the user decides to change their MFA to phone message. The process is similar to the email process above, except that an enrollment UI will need to be triggered to accept and verify the phone number, [as described here](https://auth0.com/docs/secure/multi-factor-authentication/customize-mfa/customize-mfa-enrollments-universal-login#how-it-works).

```jsx
///
// URL parameter "set_mfa_phone"

// Step 1
exports.onExecutePostLogin = async (event, api) => {
  // Look for existing factors
  // Challenge with email
  api.authentication.challengeWith({ type: "email" });
};

// Step 2
exports.onExecutePostLogin = async (event, api) => {
  // Look for existing app OTP or phone factors
  // No existing factors to delete
};

// Step 3
exports.onExecutePostLogin = async (event, api) => {
  // Enroll phone factor
  api.authentication.enrollWith({ type: "phone" });
};

// Step 4
exports.onExecutePostLogin = async (event, api) => {
  // Verify the user has the factor
  // Phone was enrolled so it appears in the list

  // Set metadata flag
  api.user.setAppMetadata("mfa_challenge_factor", "phone");
};
```

A few notes on the above:

- MFA management is a sensitive operation so Auth0 requires an MFA challenge before making changes.
- There are 3 separate Actions instead of one because the Action function needs to complete execution before the user interaction is shown. Both the first and second Actions have an interaction so they must be separate, then the third it used to save the metadata.
- Note that the Auth0 user profile phone number has not changed because MFA enrollment is decoupled from the user profile data for phone-based MFA (unlike email MFA).

Resulting user is below.

```json
{
  "enrolled_mfa_factors": ["email", "phone"],
  "mfa_challenge_factor": "phone",
  "email": "person@example.com",
  "email_verified": true
}
```

Now the user wants to set MFA to OTP app. The process is similar to the phone enrollment:

```jsx
///
// URL parameter "set_mfa_otp"

// Step 1
exports.onExecutePostLogin = async (event, api) => {
  // Look for existing factors
  // Challenge with phone
  api.authentication.challengeWith({ type: "phone" });
};

// Step 2
exports.onExecutePostLogin = async (event, api) => {
  // Look for existing app OTP or phone factors
  // Render MFA factor delete form
  api.prompt.render("delete_mfa_form_id");
};

// Step 3
exports.onExecutePostLogin = async (event, api) => {
  // Enroll OTP application
  api.authentication.enrollWith({ type: "otp" });
};

// Step 4
exports.onExecutePostLogin = async (event, api) => {
  // Verify the user has the factor
  // OTP app was enrolled so it appears in the list

  // Set metadata flag
  api.user.setAppMetadata("mfa_challenge_factor", "otp");
};
```

Resulting user:

```json
{
  "enrolled_mfa_factors": ["email", "otp"],
  "mfa_challenge_factor": "otp",
  "email": "person@example.com",
  "email_verified": true
}
```

If the user wants to change their email, it would change the profile email as well as the MFA factor at the same time (remember: these are coupled for email). They would need to change and verify the email at the same time.

```jsx
///
// URL parameter "change_email"

exports.onExecutePostLogin = async (event, api) => {
  // Form for new email and verification
};
```

Resulting user:

```json
{
  "enrolled_mfa_factors": ["email", "phone"],
  "mfa_challenge_factor": "otp",
  "email": "new-email-address@example.com",
  "email_verified": true
}
```

Note that the new user information will be returned to the callback URL of the application that redirected them initially. This means that the new data can be retrieved from the ID token and saved to the user record in Guidewire. Another option would be to subscribed to a user update [Event](https://auth0.com/docs/customize/events).

If the user wants to change the phone number they're using for MFA, we would need to delete their existing enrollment and add a new one. Action-based enrollment doesn't allow 2 of the same type of factors to be enrolled (known limitation) but this functionality can be built out using APIs, if needed.

If someone has email and phone MFA and they want to change the phone number they are using for MFA, they would be challenged with that same phone number. This means that if someone lost access to their MFA factor, they would not be able to change to a new factor, which is considered account recovery [according to NIST](https://pages.nist.gov/800-63-4/sp800-63b/events/#recovery). Email MFA is not a suitable fallback in this case (though Actions may allow it).
