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
          `customScripts.${item.scriptName}: Hardcoded value in variable "${item.variableName}" at line ${item.line}.`,
          // checkmate doesn't surface the actual hardcoded value for this check, only the
          // variable name - so only validate.skipHardcodedVariable can match these findings.
          // String(...) because a numeric object-literal key (e.g. `{ 2801: 'US' }`) comes
          // back from checkmate as a real number, not the string Finding.field is typed as -
          // left as a number, it can never match a skip list entry (always a JSON string).
          { field: String(item.variableName) }
        )
      );
    }
  }

  return findings;
}
