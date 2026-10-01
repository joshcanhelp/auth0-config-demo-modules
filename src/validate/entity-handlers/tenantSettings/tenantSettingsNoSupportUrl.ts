import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

const checkSupportUrl = loadCheck("checkSupportUrl.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  tenant_settings_no_support_url: {
    level: "recommended",
    description: "No support URL is configured.",
    property: "support_url",
  },
};

export async function checkTenantSettingsNoSupportUrl(tenant: unknown): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkSupportUrl({ tenant });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "no_support_url") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "tenant_settings_no_support_url",
        "Tenant Settings",
        "support_url: No support URL is configured."
      )
    );
  }

  return findings;
}
