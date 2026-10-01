import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadFlatCheck } from "./shared.js";

const checkEnabledDatabaseCustomization = loadFlatCheck("checkEnabledDatabaseCustomization.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  databases_external_user_store: {
    level: "informational",
    description: "Custom database scripts are enabled (external user store).",
    property: "options.enabledDatabaseCustomization",
  },
};

export async function checkDatabasesExternalUserStore(
  databases: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkEnabledDatabaseCustomization({ databases });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "external_user_store") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "databases_external_user_store",
        item.name ?? "Unknown Connection",
        "options.enabledDatabaseCustomization: Custom database scripts are enabled (external user store)."
      )
    );
  }

  return findings;
}
