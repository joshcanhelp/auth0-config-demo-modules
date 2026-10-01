import { buildFinding } from "../../utils/finding.js";
import type { TenantTag } from "../../utils/tenantTag.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

// checkTenantLoginUrl reports two distinct fields - this one, and
// "no_default_redirection_uri" (see tenantSettingsNoDefaultRedirectionUri.ts). Calling it
// once per field costs a little duplicate work, traded for each validation code having its
// own self-contained file.
const checkTenantLoginUrl = loadCheck("checkTenantLoginUrl.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  tenant_settings_invalid_default_redirection_uri: {
    level: "important",
    description: "Insecure default redirection URI.",
    property: "default_redirection_uri",
  },
};

// Not checked for dev tenants - insecure-looking redirection URI patterns are expected there.
export async function checkTenantSettingsInvalidDefaultRedirectionUri(
  tenant: unknown,
  tenantTag?: TenantTag
): Promise<Finding[]> {
  if (tenantTag === "dev") return [];

  const findings: Finding[] = [];
  const result = await checkTenantLoginUrl({ tenant });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "invalid_default_redirection_uri") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "tenant_settings_invalid_default_redirection_uri",
        "Tenant Settings",
        `default_redirection_uri: Insecure default redirection URI: ${item.value}.`
      )
    );
  }

  return findings;
}
