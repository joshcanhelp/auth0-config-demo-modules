import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadNestedCheck } from "./shared.js";

const checkDASHardCodedValues = loadNestedCheck("checkDASHardCodedValues.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  databases_hard_coded_value_detected: {
    level: "important",
    description: "A hardcoded value was detected in a custom database script.",
    property: "customScripts",
  },
};

export async function checkDatabasesHardCodedValueDetected(
  databases: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkDASHardCodedValues({ databases });

  for (const entry of result.details) {
    if (!("report" in entry)) continue; // Skip flat fallback items (e.g. no_database_connections_found)
    for (const item of entry.report) {
      if (item.status !== "red" || item.field !== "hard_coded_value_detected") continue;
      findings.push(
        buildFinding(
          DEFINITIONS,
          "databases_hard_coded_value_detected",
          entry.name,
          `customScripts.${item.scriptName}: Hardcoded value in variable "${item.variableName}" at line ${item.line}.`
        )
      );
    }
  }

  return findings;
}
