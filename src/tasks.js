import mApi from "../auth0/api-management.js";
import authApi from "../auth0/api-authentication.js";
import {
  assertStrict,
  CLIENT_CREDS_KEY,
  configPromise,
  getClientId,
  getClientIdFromUserType,
  getDomain,
  getLoginNonce,
  LOGIN_STATE_KEY,
} from "./shared.js";

const USER_TYPE_LABEL = { policyholder: "PolicyHolder", agent: "Producer" };
const config = await configPromise;

// Always limit the token to the scopes you need.
// This enables the demo but may not be the actual scopes needed in prod.
export const REQUIRED_SCOPES = [
  "read:users",
  "update:users",
  "create:users",
  "create:user_tickets",
  "create:authentication_methods",
  "read:authentication_methods",
  "update:authentication_methods",
  "delete:authentication_methods",
  "create:guardian_enrollment_tickets",
];
//--

// MFA types to display options
export const ALLOWED_MFA_TYPES = ["phone", "email", "otp"];
//--

/**
 * Get a management API token
 *
 * @param {string} client_id - Client ID of the authorized Auth0 application
 * @param {string} client_secret - Client secret of the authorized Auth0 application
 * @returns {object} An object containing the access token, expiration, and granted scopes
 */
export const getManagementApiToken = async ({ clientId, clientSecret }) => {
  console.log("Calling getManagementApiToken()...");

  // This is the same data and endpoint used on the backend.
  // Everything here should be environment vars specific for where this is running.
  // https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-credentials-flow
  // Note that this client-side app needs CORS enabled on the token endpoint in the app.
  const data = await authApi.getTokenForClient({
    clientId,
    clientSecret,
    audience: `https://${getDomain()}/api/v2/`,
  });
  //--

  // This is what the token is authorized to do.
  // You can check this for safety and better error reporting.
  const grantedScopes = data.scope ? data.scope.split(" ") : [];
  const _missingScopes = REQUIRED_SCOPES.filter((s) => !grantedScopes.includes(s));
  //--

  // if (missingScopes.length > 0) {
  //   throw new Error(`Missing required scopes: ${missingScopes.join(", ")}`);
  // }

  return {
    // Use this to cache and refresh the token.
    expiresInSeconds: data.expires_in,
    //--
    token: data.access_token,
    grantedScopes: data.scope,
  };
};

/**
 * Create a new user with Guidewire-specific data.
 *
 * @param {string} company - See assertion in function body for valid values.
 * @param {string} userType - See assertion in function body for valid values.
 * @param {object} userData - User data from the applications.
 * @param {Array} grantedAuthorities - Optional array of granted authorities.
 * @returns {string} Password reset URL to send to the user
 */
export const createNewUser = async ({
  company,
  userType,
  userData,
  grantedAuthorities = [],
}) => {
  console.log("Calling createNewUser()...");

  // This is required validation that PolicyCenter will need to do.
  assertStrict(["twia", "tfpa"].includes(company), "Invalid company");
  assertStrict(["policyholder", "agent"].includes(userType), "Invalid user type");
  assertStrict(userData.username, "Missing username");
  //--

  const newUserData = {
    // Data from Guidewire
    // Username should be checked for uniqueness before calling this method.
    username: userData.username,
    email: userData.email,
    given_name: userData.given_name,
    family_name: userData.family_name,
    //--

    // Name of the user database based on user type (producer or policyholder)
    connection: "main",
    //--

    // TWIA/TFPA managed data
    app_metadata: {
      // Adding this explictly but it could be derived from the group.
      company,
      user_type: userType,
      //--

      // Allows for user invitations to be sent via the reset password email
      invited: true,
      //--

      guidewire_groups: [
        `${company.toUpperCase()}${USER_TYPE_LABEL[userType]}`,
        `${company}.dev.gwcpdev.all.accountmanagement.users`,
        `${company}.pre.gwcpdev.all.accountmanagement.users`,
      ],
    },
    //--

    // Workaround for duplicate email, see below.
    email_verified: true,
    //--
  };

  if (userType === "policyholder") {
    newUserData.app_metadata.granted_authorities = grantedAuthorities || [];
  }

  // This will return 409 if the username already exists/
  const newUser = await mApi.createUser(newUserData);
  //--

  // Work-around to avoid a separate verification email.
  // Email will be verifed when password is set.
  await mApi.patchUser(newUser.user_id, { email_verified: false });
  //--

  console.log("User created with ID:", newUser.user_id);
  const ticketData = await mApi.createPasswordTicket({
    user_id: newUser.user_id,

    // We need the client ID for the company the user is being added to
    // so the ticket redirects to the right place and has the right branding.
    client_id: getClientIdFromUserType(userType),
    //--

    // The user is getting an email to reset their password, so we can mark email as verified.
    // This is required for MFA, if the user chooses to enroll.
    mark_email_as_verified: true,
    //--
  });
  console.log("Password reset ticket created:", ticketData);

  return ticketData.ticket;
};

/**
 * Generate a login link for the specified application.
 *
 * @param {string} appId - Designates what application is being used to log in.
 * @param {string} action - Optional custom action to trigger specific rules or flows.
 * @param {object} state - Optional state object to maintain context through the login flow.
 * @returns {string} Authorize URL to redirect the user to for login.
 */
export const getLoginLink = ({ clientId, action, state }) => {
  console.log("Calling getLoginLink()...");

  const params = new URLSearchParams({
    client_id: clientId || getClientId(),

    // ID tokens need a nonce to prevent replay attacks.
    nonce: getLoginNonce(),
    //--

    // Standard OIDC scopes by default.
    // https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
    scope: "openid profile email phone_verified phone",
    redirect_uri: window.origin + "/user-login-callback.html",
    //--

    // In production, response_type should always be "code"
    response_type: "code",
    //--

    connection: config.connection,
  });

  if (action) {
    params.set("action", action);
  }

  if (state) {
    const encoded = btoa(JSON.stringify(state));
    sessionStorage.setItem(LOGIN_STATE_KEY, encoded);
    params.set("state", encoded);
  }

  return `https://login-test.twia.org/authorize?${params}`;
};

/**
 * Updates the app_metadata with a new value in the valueList.
 *
 * @param {string} userId - Auth0 User ID (e.g. "auth0|123456789")
 * @param {string} newValue - The new value to add to the valueList
 * @returns {Promise<void>}
 */
export const addMetadataValueToList = async ({ userId, newValue }) => {
  // We need the current user metadata to merge in the new value.
  const userData = await mApi.getUser(userId);
  const valueList = userData.app_metadata?.valueList ?? [];

  // User app_metadata will be merged with existing app_metadata to a depth of 1 level.
  const patchData = {
    app_metadata: {
      valueList: Array.from(new Set([...valueList, newValue])),
    },
  };

  await mApi.patchUser(userId, patchData);
};

/**
 * Send the user an email verification link.
 *
 * @param {string} userId - Auth0 user ID
 * @param {string} appId - Application ID to redirect after email verification
 * @returns {Promise<string>} - Email verification ticket URL
 */
export const createEmailVerificationLink = async ({ userId }) => {
  console.log("Calling createEmailVerificationLink()...");

  const ticketData = await mApi.createEmailVerificationTicket(userId);
  return ticketData.ticket;
};

/**
 * Send the user an email verification link.
 *
 * @param {string} userId - Auth0 user ID
 * @param {string} appId - Application ID to redirect after email verification
 * @returns {Promise<string>} - Email verification ticket URL
 */
export const createPasswordChangeTicket = async ({ userId }) => {
  console.log("Calling createPasswordChangeTicket()...");

  const ticketData = await mApi.createPasswordTicket({ user_id: userId });
  return ticketData.ticket;
};

/**
 * Search for users based on a query.
 *
 * @param {string} searchFor - The search query.
 * @returns {Promise<Array>} - Array of user objects.
 */
export const searchUsers = async (searchFor) => {
  console.log("Calling searchUsers()...");

  // We can search multiple fields with the data we're being sent.
  // That could be helpful in case the username is different from the personal info.
  // https://auth0.com/docs/manage-users/user-search/user-search-query-syntax
  const query = `name:*${searchFor}* OR email:*${searchFor}* OR username:*${searchFor}*`;
  //--

  return await mApi.getUsers(query);
};

/**
 * Check for an existing username to prevent duplicates before creating a new user.
 *
 * @param {string} username - The username to check for existence.
 * @returns {Promise<Array>} - Array of user objects with the given username.
 */
export const searchForUsername = async (username) => {
  console.log("Calling searchForUsername()...");

  // This will let us search for a username pattern to avoid mutliple checks.
  // https://auth0.com/docs/manage-users/user-search/user-search-query-syntax
  const query = `username:${username}*`;
  //--

  return await mApi.getUsers(query);
};

/**
 * Get a user by their Auth0 user ID.
 * https://auth0.com/docs/manage-users/user-accounts/user-profiles/user-profile-structure
 *
 * @param {string} userId - Auth0 user ID
 * @returns {Promise<Object>} - User object.
 */
export const getAuth0User = async (userId) => {
  console.log("Calling getAuth0User()...");

  console.assert(userId, "User ID is required");
  return await mApi.getUser(userId);
};

/**
 * Update a user by their Auth0 user ID.
 *
 * @param {string} userId - Auth0 user ID
 * @param {Object} data - Data to update
 * @returns {Promise<Object>} - Updated user object.
 */
export const updateAuth0User = async (userId, data) => {
  console.log("Calling updateAuth0User()...");

  console.assert(userId, "User ID is required");
  return await mApi.patchUser(userId, data);
};

/**
 * Send the user a password reset link.
 * https://auth0.com/docs/customize/email/send-email-invitations-for-application-signup
 *
 * @param {string} userId - Auth0 user ID
 * @param {string} appId - Application ID to redirect after email verification
 */
export const triggerChangePassword = async ({ email }) => {
  const clientCreds = JSON.parse(sessionStorage.getItem(CLIENT_CREDS_KEY) || "{}");
  assertStrict(clientCreds.client_id, "Client credentials not found in session storage");
  await authApi.changePassword({
    clientId: clientCreds.client_id,
    connectionName: config.connection,
    email,
  });
};
