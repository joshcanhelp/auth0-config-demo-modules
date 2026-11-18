import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

// checkTenantLogoutUrl reports two distinct fields - this one, and
// "invalid_allowed_logout_urls" (see tenantSettingsInvalidAllowedLogoutUrl.ts). Calling it
// once per field costs a little duplicate work, traded for each validation code having its
// own self-contained file.
const checkTenantLogoutUrl = loadCheck("checkTenantLogoutUrl.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  tenant_settings_missing_allowed_logout_urls: {
    level: "recommended",
    description: "No allowed logout URLs are configured.",
    property: "allowed_logout_urls",
  },
};

export async function checkTenantSettingsMissingAllowedLogoutUrls(
  tenant: unknown
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkTenantLogoutUrl({ tenant });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "missing_allowed_logout_urls") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "tenant_settings_missing_allowed_logout_urls",
        "Tenant Settings",
        "allowed_logout_urls: No allowed logout URLs are configured."
      )
    );
  }

  return findings;
}
