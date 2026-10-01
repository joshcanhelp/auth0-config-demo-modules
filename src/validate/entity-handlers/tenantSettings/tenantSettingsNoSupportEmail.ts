import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

const checkSupportEmail = loadCheck("checkSupportEmail.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  tenant_settings_no_support_email: {
    level: "recommended",
    description: "No support email address is configured.",
    property: "support_email",
  },
};

export async function checkTenantSettingsNoSupportEmail(tenant: unknown): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkSupportEmail({ tenant });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "no_support_email") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "tenant_settings_no_support_email",
        "Tenant Settings",
        "support_email: No support email address is configured."
      )
    );
  }

  return findings;
}
