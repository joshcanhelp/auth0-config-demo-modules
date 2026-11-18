import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadFlatCheck } from "./shared.js";

const checkPasswordHistory = loadFlatCheck("checkPasswordHistory.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  databases_password_history_disabled: {
    level: "recommended",
    description: "Password history is disabled. Enable it to prevent password reuse.",
    property: "options.password_history",
  },
};

export async function checkDatabasesPasswordHistoryDisabled(
  databases: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkPasswordHistory({ databases });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "password_history_disabled") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "databases_password_history_disabled",
        item.name ?? "Unknown Connection",
        "options.password_history: Password history is disabled. Enable it to prevent password reuse."
      )
    );
  }

  return findings;
}
