import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

const checkDefaultDirectory = loadCheck("checkDefaultDirectory.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  tenant_settings_default_directory_set: {
    level: "informational",
    description: "Reports the configured default directory.",
    property: "default_directory",
  },
};

// INFO status (no_default_directory) means it's not set - no finding needed.
export async function checkTenantSettingsDefaultDirectorySet(
  tenant: unknown
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkDefaultDirectory({ tenant });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "default_directory") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "tenant_settings_default_directory_set",
        "Tenant Settings",
        `default_directory: Default directory is set to "${item.value}".`
      )
    );
  }

  return findings;
}
