import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadFlatCheck } from "./shared.js";

// checkPasswordPolicy reports two distinct fields - this one, and
// "missing_password_policy" (see databasesPasswordPolicyMissing.ts). Calling it once per
// field costs a little duplicate work, traded for each validation code having its own
// self-contained file.
const checkPasswordPolicy = loadFlatCheck("checkPasswordPolicy.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  databases_password_policy_weak: {
    level: "important",
    description: 'Password policy is below "good" or "excellent".',
    property: "options.passwordPolicy",
  },
};

export async function checkDatabasesPasswordPolicyWeak(
  databases: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkPasswordPolicy({ databases });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "password_policy") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "databases_password_policy_weak",
        item.name ?? "Unknown Connection",
        `options.passwordPolicy: Password policy is "${item.value}". Use "good" or "excellent".`
      )
    );
  }

  return findings;
}
