import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadFlatCheck } from "./shared.js";

// checkPasswordComplexity reports two distinct fields - this one, and
// "password_min_length_fail" (see databasesPasswordMinLength.ts). Calling it once per field
// costs a little duplicate work, traded for each validation code having its own
// self-contained file.
const checkPasswordComplexity = loadFlatCheck("checkPasswordComplexity.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  databases_password_complexity_not_configured: {
    level: "recommended",
    description: "Password complexity options are not configured.",
    property: "options.password_complexity_options",
  },
};

export async function checkDatabasesPasswordComplexityNotConfigured(
  databases: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkPasswordComplexity({ databases });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "password_complexity_not_configured") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "databases_password_complexity_not_configured",
        item.name ?? "Unknown Connection",
        "options.password_complexity_options: Password complexity options are not configured."
      )
    );
  }

  return findings;
}
