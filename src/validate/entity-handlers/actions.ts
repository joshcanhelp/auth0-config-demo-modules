import { createRequire } from "node:module";

import type { Finding } from "../types.js";
import type { TenantTag } from "./clients.js";

const _require = createRequire(import.meta.url);

// checkActionsRuntime returns a flat array of items directly.
// checkActionsHardCodedValues and checkUserEnumeration return nested { name, report } arrays.
type CheckmateFlatItem = { name: string; field: string; status: string; value?: string | number };
type CheckmateReportItem = { field: string; status: string; value?: string; variableName?: string; line?: string | number };
type CheckmateNestedReport = { name: string; report: CheckmateReportItem[] };

type CheckmateFlatResult = { details: CheckmateFlatItem[] };
type CheckmateNestedResult = { details: CheckmateNestedReport[] };

type CheckmateFlatFn = (options: { actions: unknown[] }) => Promise<CheckmateFlatResult>;
type CheckmateNestedFn = (options: { actions: unknown[] }) => Promise<CheckmateNestedResult>;

const checkActionsRuntime = _require(
  "auth0-checkmate/analyzer/lib/actions/checkActionsRuntime.js"
) as CheckmateFlatFn;

const checkActionsHardCodedValues = _require(
  "auth0-checkmate/analyzer/lib/actions/checkActionsHardCodedValues.js"
) as CheckmateNestedFn;

const checkUserEnumeration = _require(
  "auth0-checkmate/analyzer/lib/actions/checkUserEnumeration.js"
) as CheckmateNestedFn;

// Skipped checks:
// - checkDependencies: makes external HTTP calls to check npm vulnerability databases
// - checkPasswordResetMFA: requires database data ({ actions, databases }) in addition to actions

function parseActionName(fullName: string): { actionName: string; trigger: string } {
  const parenIndex = fullName.lastIndexOf(" (");
  if (parenIndex !== -1 && fullName.endsWith(")")) {
    return {
      actionName: fullName.slice(0, parenIndex),
      trigger: fullName.slice(parenIndex + 2, -1),
    };
  }
  return { actionName: fullName, trigger: "" };
}

export async function validateActions(actions: unknown[], tenantTag?: TenantTag): Promise<Finding[]> {
  const findings: Finding[] = [];

  const [runtimeResult, hardcodedResult, userEnumResult] = await Promise.all([
    checkActionsRuntime({ actions }),
    checkActionsHardCodedValues({ actions }),
    checkUserEnumeration({ actions }),
  ]);

  // Flat result - each item is a direct report entry
  for (const r of runtimeResult.details) {
    if (r.status !== "red") continue;
    const { actionName, trigger } = parseActionName(r.name);
    switch (r.field) {
      case "old_node_version":
        findings.push({
          code: "actions_old_node_version",
          level: "important",
          clientName: actionName,
          clientId: trigger,
          message: `runtime: Node.js version ${r.value} is below the minimum supported version.`,
        });
        break;
    }
  }

  // Nested results - each item wraps a { name, report[] }
  for (const actionReport of hardcodedResult.details) {
    const { actionName, trigger } = parseActionName(actionReport.name);
    for (const r of actionReport.report) {
      if (r.status !== "red") continue;
      switch (r.field) {
        case "hard_coded_value_detected":
          findings.push({
            code: "actions_hard_coded_value_detected",
            level: "important",
            clientName: actionName,
            clientId: trigger,
            message: `code: Hardcoded value "${r.value}" in variable "${r.variableName}" at line ${r.line}.`,
          });
          break;
      }
    }
  }

  // Nested results - uses WARN (yellow) status, not FAIL (red)
  for (const actionReport of userEnumResult.details) {
    const { actionName, trigger } = parseActionName(actionReport.name);
    for (const r of actionReport.report) {
      if (r.status !== "yellow") continue;
      switch (r.field) {
        case "user_enumeration_vulnerability":
          findings.push({
            code: "actions_user_enumeration_vulnerability",
            level: "recommended",
            clientName: actionName,
            clientId: trigger,
            message: `code: Use of api.access.deny() at line ${r.line} may expose user enumeration.`,
          });
          break;
      }
    }
  }

  return findings;
}
