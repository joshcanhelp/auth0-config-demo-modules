import { createRequire } from "node:module";

import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { parseActionName, type CheckmateFlatFn } from "./shared.js";

const _require = createRequire(import.meta.url);

const checkActionsRuntime = _require(
  "auth0-checkmate/analyzer/lib/actions/checkActionsRuntime.js"
) as CheckmateFlatFn;

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  actions_old_node_version: {
    level: "important",
    description: "Node.js version is below the minimum supported version.",
    property: "runtime",
  },
};

// Action modules have no runtime field, so this check doesn't apply to them - only actions
// have this called.
export async function checkOldNodeVersion(actions: unknown[]): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkActionsRuntime({ actions });

  for (const r of result.details) {
    if (r.status !== "red" || r.field !== "old_node_version") continue;
    const { actionName, trigger } = parseActionName(r.name);
    findings.push(
      buildFinding(
        DEFINITIONS,
        "actions_old_node_version",
        actionName,
        `runtime: Node.js version ${r.value} is below the minimum supported version.`,
        { entityId: trigger }
      )
    );
  }

  return findings;
}
