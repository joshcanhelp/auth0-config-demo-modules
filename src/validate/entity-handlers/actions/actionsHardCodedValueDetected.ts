import { createRequire } from "node:module";

import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { parseActionName, type CheckmateNestedFn } from "./shared.js";

const _require = createRequire(import.meta.url);

const checkActionsHardCodedValues = _require(
  "auth0-checkmate/analyzer/lib/actions/checkActionsHardCodedValues.js"
) as CheckmateNestedFn;

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  actions_hard_coded_value_detected: {
    level: "important",
    description: "A hardcoded value was detected in the action code.",
    property: "code",
  },
};

// Shared by both real actions and action modules. Action modules have no real trigger, so
// `includeEntityId: false` is passed for them - the synthetic trigger id manufactured just to
// satisfy checkmate's name formatting isn't a meaningful entityId to report.
export async function checkHardCodedValues(
  actions: unknown[],
  options: { includeEntityId?: boolean } = {}
): Promise<Finding[]> {
  const { includeEntityId = true } = options;
  const findings: Finding[] = [];
  const result = await checkActionsHardCodedValues({ actions });

  for (const actionReport of result.details) {
    const { actionName, trigger } = parseActionName(actionReport.name);
    for (const r of actionReport.report) {
      if (r.status !== "red" || r.field !== "hard_coded_value_detected") continue;
      findings.push(
        buildFinding(
          DEFINITIONS,
          "actions_hard_coded_value_detected",
          actionName,
          `code: Hardcoded value "${r.value}" in variable "${r.variableName}" at line ${r.line}.`,
          includeEntityId ? { entityId: trigger } : undefined
        )
      );
    }
  }

  return findings;
}
