import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

const checkDefaultAudience = loadCheck("checkDefaultAudience.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  tenant_settings_default_audience_set: {
    level: "recommended",
    description:
      "A default audience is configured, which implicitly adds the audience to all tokens.",
    property: "default_audience",
  },
};

// INFO status (no_default_audience) means it's not set - no finding needed.
export async function checkTenantSettingsDefaultAudienceSet(tenant: unknown): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkDefaultAudience({ tenant });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "default_audience") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "tenant_settings_default_audience_set",
        "Tenant Settings",
        `default_audience: A default audience is configured ("${item.value}"). This implicitly adds the audience to all tokens.`
      )
    );
  }

  return findings;
}
