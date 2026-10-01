import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadFlatCheck } from "./shared.js";

const checkAuthenticationMethods = loadFlatCheck("checkAuthenticationMethods.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  databases_only_password_method: {
    level: "recommended",
    description: "Only password authentication is enabled. Consider enabling passkeys.",
    property: "authentication_methods",
  },
};

export async function checkDatabasesOnlyPasswordMethod(
  databases: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkAuthenticationMethods({ databases });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "only_password_method") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "databases_only_password_method",
        item.name ?? "Unknown Connection",
        "authentication_methods: Only password authentication is enabled. Consider enabling passkeys."
      )
    );
  }

  return findings;
}
