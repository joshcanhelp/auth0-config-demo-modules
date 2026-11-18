import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

// checkTenantLoginUrl reports two distinct fields - this one, and
// "invalid_default_redirection_uri" (see tenantSettingsInvalidDefaultRedirectionUri.ts).
// Calling it once per field costs a little duplicate work, traded for each validation code
// having its own self-contained file.
const checkTenantLoginUrl = loadCheck("checkTenantLoginUrl.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  tenant_settings_no_default_redirection_uri: {
    level: "recommended",
    description: "No default redirection URI is configured.",
    property: "default_redirection_uri",
  },
};

export async function checkTenantSettingsNoDefaultRedirectionUri(
  tenant: unknown
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkTenantLoginUrl({ tenant });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "no_default_redirection_uri") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "tenant_settings_no_default_redirection_uri",
        "Tenant Settings",
        "default_redirection_uri: No default redirection URI is configured."
      )
    );
  }

  return findings;
}
