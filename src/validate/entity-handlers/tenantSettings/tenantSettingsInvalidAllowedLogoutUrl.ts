import { buildFinding } from "../../utils/finding.js";
import type { TenantTag } from "../../utils/tenantTag.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

// checkTenantLogoutUrl reports two distinct fields - this one, and
// "missing_allowed_logout_urls" (see tenantSettingsMissingAllowedLogoutUrls.ts). Calling it
// once per field costs a little duplicate work, traded for each validation code having its
// own self-contained file.
const checkTenantLogoutUrl = loadCheck("checkTenantLogoutUrl.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  tenant_settings_invalid_allowed_logout_url: {
    level: "important",
    description: "Insecure logout URL.",
    property: "allowed_logout_urls",
  },
};

// Not checked for dev tenants - insecure-looking logout URL patterns are expected there.
export async function checkTenantSettingsInvalidAllowedLogoutUrl(
  tenant: unknown,
  tenantTag?: TenantTag
): Promise<Finding[]> {
  if (tenantTag === "dev") return [];

  const findings: Finding[] = [];
  const result = await checkTenantLogoutUrl({ tenant });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "invalid_allowed_logout_urls") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "tenant_settings_invalid_allowed_logout_url",
        "Tenant Settings",
        `allowed_logout_urls: Insecure logout URL: ${item.value}.`
      )
    );
  }

  return findings;
}
