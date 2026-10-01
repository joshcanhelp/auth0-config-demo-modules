import type { TenantTag } from "../../utils/tenantTag.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import {
  checkTenantSettingsDefaultAudienceSet,
  DEFINITIONS as DEFAULT_AUDIENCE_SET_DEFINITIONS,
} from "./tenantSettingsDefaultAudienceSet.js";
import {
  checkTenantSettingsDefaultDirectorySet,
  DEFINITIONS as DEFAULT_DIRECTORY_SET_DEFINITIONS,
} from "./tenantSettingsDefaultDirectorySet.js";
import {
  checkTenantSettingsDynamicClientRegistrationEnabled,
  DEFINITIONS as DYNAMIC_CLIENT_REGISTRATION_ENABLED_DEFINITIONS,
} from "./tenantSettingsDynamicClientRegistrationEnabled.js";
import {
  checkTenantSettingsIdleSessionLifetime,
  DEFINITIONS as IDLE_SESSION_LIFETIME_DEFINITIONS,
} from "./tenantSettingsIdleSessionLifetime.js";
import {
  checkTenantSettingsInvalidAllowedLogoutUrl,
  DEFINITIONS as INVALID_ALLOWED_LOGOUT_URL_DEFINITIONS,
} from "./tenantSettingsInvalidAllowedLogoutUrl.js";
import {
  checkTenantSettingsInvalidDefaultRedirectionUri,
  DEFINITIONS as INVALID_DEFAULT_REDIRECTION_URI_DEFINITIONS,
} from "./tenantSettingsInvalidDefaultRedirectionUri.js";
import {
  checkTenantSettingsMissingAllowedLogoutUrls,
  DEFINITIONS as MISSING_ALLOWED_LOGOUT_URLS_DEFINITIONS,
} from "./tenantSettingsMissingAllowedLogoutUrls.js";
import {
  checkTenantSettingsNoDefaultRedirectionUri,
  DEFINITIONS as NO_DEFAULT_REDIRECTION_URI_DEFINITIONS,
} from "./tenantSettingsNoDefaultRedirectionUri.js";
import {
  checkTenantSettingsNoSupportEmail,
  DEFINITIONS as NO_SUPPORT_EMAIL_DEFINITIONS,
} from "./tenantSettingsNoSupportEmail.js";
import {
  checkTenantSettingsNoSupportUrl,
  DEFINITIONS as NO_SUPPORT_URL_DEFINITIONS,
} from "./tenantSettingsNoSupportUrl.js";
import {
  checkTenantSettingsSandboxVersionOutdated,
  DEFINITIONS as SANDBOX_VERSION_OUTDATED_DEFINITIONS,
} from "./tenantSettingsSandboxVersionOutdated.js";
import {
  checkTenantSettingsSessionCookieMode,
  DEFINITIONS as SESSION_COOKIE_MODE_DEFINITIONS,
} from "./tenantSettingsSessionCookieMode.js";
import {
  checkTenantSettingsSessionLifetime,
  DEFINITIONS as SESSION_LIFETIME_DEFINITIONS,
} from "./tenantSettingsSessionLifetime.js";

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  ...DEFAULT_AUDIENCE_SET_DEFINITIONS,
  ...DEFAULT_DIRECTORY_SET_DEFINITIONS,
  ...DYNAMIC_CLIENT_REGISTRATION_ENABLED_DEFINITIONS,
  ...SANDBOX_VERSION_OUTDATED_DEFINITIONS,
  ...IDLE_SESSION_LIFETIME_DEFINITIONS,
  ...SESSION_LIFETIME_DEFINITIONS,
  ...SESSION_COOKIE_MODE_DEFINITIONS,
  ...NO_SUPPORT_EMAIL_DEFINITIONS,
  ...NO_SUPPORT_URL_DEFINITIONS,
  ...NO_DEFAULT_REDIRECTION_URI_DEFINITIONS,
  ...INVALID_DEFAULT_REDIRECTION_URI_DEFINITIONS,
  ...MISSING_ALLOWED_LOGOUT_URLS_DEFINITIONS,
  ...INVALID_ALLOWED_LOGOUT_URL_DEFINITIONS,
};

export async function validateTenantSettings(
  tenant: unknown,
  tenantTag?: TenantTag
): Promise<Finding[]> {
  const results = await Promise.all([
    checkTenantSettingsDefaultAudienceSet(tenant),
    checkTenantSettingsDefaultDirectorySet(tenant),
    checkTenantSettingsDynamicClientRegistrationEnabled(tenant),
    checkTenantSettingsSandboxVersionOutdated(tenant),
    checkTenantSettingsIdleSessionLifetime(tenant),
    checkTenantSettingsSessionLifetime(tenant),
    checkTenantSettingsSessionCookieMode(tenant),
    checkTenantSettingsNoSupportEmail(tenant),
    checkTenantSettingsNoSupportUrl(tenant),
    checkTenantSettingsNoDefaultRedirectionUri(tenant),
    checkTenantSettingsInvalidDefaultRedirectionUri(tenant, tenantTag),
    checkTenantSettingsMissingAllowedLogoutUrls(tenant),
    checkTenantSettingsInvalidAllowedLogoutUrl(tenant, tenantTag),
  ]);

  return results.flat();
}
