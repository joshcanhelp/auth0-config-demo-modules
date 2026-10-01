import type { Management } from "auth0";

import type { Finding, ValidationDefinition } from "../../types.js";
import {
  checkClientAuthenticationMethodsPrivateKeyJwt,
  DEFINITIONS as PRIVATE_KEY_JWT_DEFINITIONS,
} from "./clientsClientAuthenticationMethodsPrivateKeyJwt.js";
import {
  checkCrossOriginAuthenticationEnabled,
  DEFINITIONS as CROSS_ORIGIN_AUTHENTICATION_DEFINITIONS,
} from "./clientsCrossOriginAuthenticationEnabled.js";
import {
  checkInsecureAllowedLogoutUrls,
  DEFINITIONS as INSECURE_ALLOWED_LOGOUT_URLS_DEFINITIONS,
} from "./clientsInsecureAllowedLogoutUrls.js";
import {
  checkInsecureCallbacks,
  DEFINITIONS as INSECURE_CALLBACKS_DEFINITIONS,
} from "./clientsInsecureCallbacks.js";
import {
  checkInsecureInitiateLoginUri,
  DEFINITIONS as INSECURE_INITIATE_LOGIN_URI_DEFINITIONS,
} from "./clientsInsecureInitiateLoginUri.js";
import {
  checkInsecureWebOriginsUrls,
  DEFINITIONS as INSECURE_WEB_ORIGINS_URLS_DEFINITIONS,
} from "./clientsInsecureWebOriginsUrls.js";
import {
  checkMissingInitiateLoginUri,
  DEFINITIONS as MISSING_INITIATE_LOGIN_URI_DEFINITIONS,
} from "./clientsMissingInitiateLoginUri.js";
import {
  checkNotUsingAsymmetricAlg,
  DEFINITIONS as NOT_USING_ASYMMETRIC_ALG_DEFINITIONS,
} from "./clientsNotUsingAsymmetricAlg.js";
import {
  checkOidcBackchannelLogoutUrls,
  DEFINITIONS as OIDC_BACKCHANNEL_LOGOUT_URLS_DEFINITIONS,
} from "./clientsOidcBackchannelLogoutUrls.js";
import {
  checkRequirePushedAuthorizationRequests,
  DEFINITIONS as REQUIRE_PUSHED_AUTHORIZATION_REQUESTS_DEFINITIONS,
} from "./clientsRequirePushedAuthorizationRequests.js";
import {
  checkSignedRequestObjectCredentials,
  DEFINITIONS as SIGNED_REQUEST_OBJECT_CREDENTIALS_DEFINITIONS,
} from "./clientsSignedRequestObjectCredentials.js";
import {
  checkSignedRequestObjectRequired,
  DEFINITIONS as SIGNED_REQUEST_OBJECT_REQUIRED_DEFINITIONS,
} from "./clientsSignedRequestObjectRequired.js";
import {
  checkUnexpectedFieldsForAppType,
  DEFINITIONS as UNEXPECTED_FIELDS_FOR_APP_TYPE_DEFINITIONS,
} from "./clientsUnexpectedFieldsForAppType.js";
import {
  checkUnexpectedGrantTypeForAppType,
  DEFINITIONS as UNEXPECTED_GRANT_TYPE_FOR_APP_TYPE_DEFINITIONS,
} from "./clientsUnexpectedGrantTypeForAppType.js";
import {
  checkUseRotatingRefreshToken,
  DEFINITIONS as USE_ROTATING_REFRESH_TOKEN_DEFINITIONS,
} from "./clientsUseRotatingRefreshToken.js";
import { TENANT_TAGS, type TenantTag } from "./shared.js";

export { TENANT_TAGS };
export type { TenantTag };

// One file per validation code in this folder owns that code's own DEFINITIONS and check
// logic. This file only wires them together: which checks run, and what their combined
// DEFINITIONS map looks like.
export const DEFINITIONS: Record<string, ValidationDefinition> = {
  ...INSECURE_CALLBACKS_DEFINITIONS,
  ...INSECURE_ALLOWED_LOGOUT_URLS_DEFINITIONS,
  ...USE_ROTATING_REFRESH_TOKEN_DEFINITIONS,
  ...INSECURE_WEB_ORIGINS_URLS_DEFINITIONS,
  ...INSECURE_INITIATE_LOGIN_URI_DEFINITIONS,
  ...UNEXPECTED_GRANT_TYPE_FOR_APP_TYPE_DEFINITIONS,
  ...SIGNED_REQUEST_OBJECT_CREDENTIALS_DEFINITIONS,
  ...CROSS_ORIGIN_AUTHENTICATION_DEFINITIONS,
  ...NOT_USING_ASYMMETRIC_ALG_DEFINITIONS,
  ...MISSING_INITIATE_LOGIN_URI_DEFINITIONS,
  ...OIDC_BACKCHANNEL_LOGOUT_URLS_DEFINITIONS,
  ...SIGNED_REQUEST_OBJECT_REQUIRED_DEFINITIONS,
  ...REQUIRE_PUSHED_AUTHORIZATION_REQUESTS_DEFINITIONS,
  ...PRIVATE_KEY_JWT_DEFINITIONS,
  ...UNEXPECTED_FIELDS_FOR_APP_TYPE_DEFINITIONS,
};

// Skipped checks for clients:
// - checkAppTokenSenderConstraining (mTLS proof-of-possession, field
//   "require_proof_of_possession"): not yet clear which app types should require this -
//   needs investigation before it's worth surfacing as a finding.

export async function validateClients(
  clients: Management.Client[],
  tenantTag?: TenantTag
): Promise<Finding[]> {
  const nonGlobalClients = clients.filter((c) => !c.global);
  const tag = tenantTag || "prod";

  const results = await Promise.all([
    checkInsecureCallbacks(nonGlobalClients, tag),
    checkInsecureAllowedLogoutUrls(nonGlobalClients, tag),
    checkUseRotatingRefreshToken(nonGlobalClients),
    checkInsecureWebOriginsUrls(nonGlobalClients, tag),
    checkInsecureInitiateLoginUri(nonGlobalClients, tag),
    checkUnexpectedGrantTypeForAppType(nonGlobalClients),
    checkSignedRequestObjectCredentials(nonGlobalClients),
    checkCrossOriginAuthenticationEnabled(nonGlobalClients),
    checkNotUsingAsymmetricAlg(nonGlobalClients),
    checkMissingInitiateLoginUri(nonGlobalClients),
    checkOidcBackchannelLogoutUrls(nonGlobalClients),
    checkSignedRequestObjectRequired(nonGlobalClients),
    checkRequirePushedAuthorizationRequests(nonGlobalClients),
    checkClientAuthenticationMethodsPrivateKeyJwt(nonGlobalClients),
  ]);

  return [...results.flat(), ...checkUnexpectedFieldsForAppType(nonGlobalClients)];
}
