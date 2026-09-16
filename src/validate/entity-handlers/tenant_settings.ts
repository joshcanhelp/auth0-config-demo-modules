import { createRequire } from "node:module";

import { buildFinding } from "../finding.js";
import type { Finding, ValidationDefinition } from "../types.js";
import type { TenantTag } from "./clients.js";

const _require = createRequire(import.meta.url);

type FlatItem = { field: string; status: string; value?: string | number; attr?: string };
type FlatResult = { details: FlatItem[] };
type CheckFn = (options: { tenant: unknown }) => Promise<FlatResult>;

function loadCheck(filename: string): CheckFn {
  return _require(`auth0-checkmate/analyzer/lib/tenant_settings/${filename}`) as CheckFn;
}

const checkDefaultAudience = loadCheck("checkDefaultAudience.js");
const checkDefaultDirectory = loadCheck("checkDefaultDirectory.js");
const checkEnabledDynamicClientRegistration = loadCheck(
  "checkEnabledDynamicClientRegistration.js"
);
const checkSandboxVersion = loadCheck("checkSandboxVersion.js");
const checkSessionLifetime = loadCheck("checkSessionLifetime.js");
const checkSupportEmail = loadCheck("checkSupportEmail.js");
const checkSupportUrl = loadCheck("checkSupportUrl.js");
const checkTenantLoginUrl = loadCheck("checkTenantLoginUrl.js");
const checkTenantLogoutUrl = loadCheck("checkTenantLogoutUrl.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  tenant_settings_default_audience_set: {
    level: "recommended",
    description:
      "default_audience: A default audience is configured, which implicitly adds the audience to all tokens.",
  },
  tenant_settings_default_directory_set: {
    level: "informational",
    description: "default_directory: Reports the configured default directory.",
  },
  tenant_settings_dynamic_client_registration_enabled: {
    level: "important",
    description:
      "flags.enable_dynamic_client_registration: Dynamic client registration is enabled. Unauthenticated clients can register themselves.",
  },
  tenant_settings_sandbox_version_outdated: {
    level: "important",
    description:
      "sandbox_version: Node.js sandbox version is below the minimum supported version.",
  },
  tenant_settings_idle_session_lifetime: {
    level: "informational",
    description: "idle_session_lifetime: Reports the configured idle session lifetime.",
  },
  tenant_settings_session_lifetime: {
    level: "informational",
    description: "session_lifetime: Reports the configured session lifetime.",
  },
  tenant_settings_session_cookie_mode: {
    level: "informational",
    description: "session_cookie.mode: Reports the configured session cookie mode.",
  },
  tenant_settings_no_support_email: {
    level: "recommended",
    description: "support_email: No support email address is configured.",
  },
  tenant_settings_no_support_url: {
    level: "recommended",
    description: "support_url: No support URL is configured.",
  },
  tenant_settings_no_default_redirection_uri: {
    level: "recommended",
    description: "default_redirection_uri: No default redirection URI is configured.",
  },
  tenant_settings_invalid_default_redirection_uri: {
    level: "important",
    description: "default_redirection_uri: Insecure default redirection URI.",
  },
  tenant_settings_missing_allowed_logout_urls: {
    level: "recommended",
    description: "allowed_logout_urls: No allowed logout URLs are configured.",
  },
  tenant_settings_invalid_allowed_logout_url: {
    level: "important",
    description: "allowed_logout_urls: Insecure logout URL.",
  },
};

export async function validateTenantSettings(
  tenant: unknown,
  tenantTag?: TenantTag
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const options = { tenant };

  const [
    audienceResult,
    directoryResult,
    dcrResult,
    sandboxResult,
    sessionResult,
    supportEmailResult,
    supportUrlResult,
    loginUrlResult,
    logoutUrlResult,
  ] = await Promise.all([
    checkDefaultAudience(options),
    checkDefaultDirectory(options),
    checkEnabledDynamicClientRegistration(options),
    checkSandboxVersion(options),
    checkSessionLifetime(options),
    checkSupportEmail(options),
    checkSupportUrl(options),
    checkTenantLoginUrl(options),
    checkTenantLogoutUrl(options),
  ]);

  // INFO status (no_default_audience) means it's not set - no finding needed
  for (const item of audienceResult.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "default_audience":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "tenant_settings_default_audience_set",
            "Tenant Settings",
            `default_audience: A default audience is configured ("${item.value}"). This implicitly adds the audience to all tokens.`
          )
        );
        break;
      default:
        throw new Error(`Unknown tenant settings check field: ${item.field}`);
    }
  }

  // INFO status (no_default_directory) means it's not set - no finding needed
  for (const item of directoryResult.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "default_directory":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "tenant_settings_default_directory_set",
            "Tenant Settings",
            `default_directory: Default directory is set to "${item.value}".`
          )
        );
        break;
      default:
        throw new Error(`Unknown tenant settings check field: ${item.field}`);
    }
  }

  for (const item of dcrResult.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "enabled_dynamic_client_registration":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "tenant_settings_dynamic_client_registration_enabled",
            "Tenant Settings",
            "flags.enable_dynamic_client_registration: Dynamic client registration is enabled. Unauthenticated clients can register themselves."
          )
        );
        break;
      case "enable_dynamic_client_registration":
        break; // Not enabled - no finding needed
      default:
        throw new Error(`Unknown tenant settings check field: ${item.field}`);
    }
  }

  for (const item of sandboxResult.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "sandbox_version":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "tenant_settings_sandbox_version_outdated",
            "Tenant Settings",
            `sandbox_version: Node.js sandbox version ${item.value} is below the minimum supported version.`
          )
        );
        break;
      default:
        throw new Error(`Unknown tenant settings check field: ${item.field}`);
    }
  }

  // Session lifetime checks surface the current config as informational
  for (const item of sessionResult.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "idle_session_lifetime":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "tenant_settings_idle_session_lifetime",
            "Tenant Settings",
            `idle_session_lifetime: Idle session lifetime is set to ${item.value}.`
          )
        );
        break;
      case "session_lifetime":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "tenant_settings_session_lifetime",
            "Tenant Settings",
            `session_lifetime: Session lifetime is set to ${item.value}.`
          )
        );
        break;
      case "session_cookie_mode":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "tenant_settings_session_cookie_mode",
            "Tenant Settings",
            `session_cookie.mode: Session cookie mode is "${item.value}".`
          )
        );
        break;
      case "tenant_setting_missing":
        break;
      default:
        throw new Error(`Unknown tenant settings check field: ${item.field}`);
    }
  }

  for (const item of supportEmailResult.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "no_support_email":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "tenant_settings_no_support_email",
            "Tenant Settings",
            "support_email: No support email address is configured."
          )
        );
        break;
      case "tenant_setting_missing":
        break;
      default:
        throw new Error(`Unknown tenant settings check field: ${item.field}`);
    }
  }

  for (const item of supportUrlResult.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "no_support_url":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "tenant_settings_no_support_url",
            "Tenant Settings",
            "support_url: No support URL is configured."
          )
        );
        break;
      case "tenant_setting_missing":
        break;
      default:
        throw new Error(`Unknown tenant settings check field: ${item.field}`);
    }
  }

  for (const item of loginUrlResult.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "no_default_redirection_uri":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "tenant_settings_no_default_redirection_uri",
            "Tenant Settings",
            "default_redirection_uri: No default redirection URI is configured."
          )
        );
        break;
      case "invalid_default_redirection_uri":
        if (tenantTag === "dev") break;
        findings.push(
          buildFinding(
            DEFINITIONS,
            "tenant_settings_invalid_default_redirection_uri",
            "Tenant Settings",
            `default_redirection_uri: Insecure default redirection URI: ${item.value}.`
          )
        );
        break;
      default:
        throw new Error(`Unknown tenant settings check field: ${item.field}`);
    }
  }

  for (const item of logoutUrlResult.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "missing_allowed_logout_urls":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "tenant_settings_missing_allowed_logout_urls",
            "Tenant Settings",
            "allowed_logout_urls: No allowed logout URLs are configured."
          )
        );
        break;
      case "invalid_allowed_logout_urls":
        if (tenantTag === "dev") break;
        findings.push(
          buildFinding(
            DEFINITIONS,
            "tenant_settings_invalid_allowed_logout_url",
            "Tenant Settings",
            `allowed_logout_urls: Insecure logout URL: ${item.value}.`
          )
        );
        break;
      default:
        throw new Error(`Unknown tenant settings check field: ${item.field}`);
    }
  }

  return findings;
}
