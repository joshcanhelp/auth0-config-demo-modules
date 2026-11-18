import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

const checkSandboxVersion = loadCheck("checkSandboxVersion.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  tenant_settings_sandbox_version_outdated: {
    level: "important",
    description: "Node.js sandbox version is below the minimum supported version.",
    property: "sandbox_version",
  },
};

export async function checkTenantSettingsSandboxVersionOutdated(
  tenant: unknown
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkSandboxVersion({ tenant });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "sandbox_version") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "tenant_settings_sandbox_version_outdated",
        "Tenant Settings",
        `sandbox_version: Node.js sandbox version ${item.value} is below the minimum supported version.`
      )
    );
  }

  return findings;
}
