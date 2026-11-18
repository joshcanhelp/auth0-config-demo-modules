import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadFlatCheck } from "./shared.js";

// checkPasswordComplexity reports two distinct fields - this one, and
// "password_complexity_not_configured" (see databasesPasswordComplexityNotConfigured.ts).
// Calling it once per field costs a little duplicate work, traded for each validation code
// having its own self-contained file.
const checkPasswordComplexity = loadFlatCheck("checkPasswordComplexity.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  databases_password_min_length: {
    level: "recommended",
    description: "Minimum password length is below the NIST-recommended 12 characters.",
    property: "options.password_complexity_options.min_length",
  },
};

export async function checkDatabasesPasswordMinLength(
  databases: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkPasswordComplexity({ databases });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "password_min_length_fail") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "databases_password_min_length",
        item.name ?? "Unknown Connection",
        `options.password_complexity_options.min_length: Minimum password length is ${item.value}. NIST recommends at least 12 characters.`
      )
    );
  }

  return findings;
}
