import { buildFinding } from "../../utils/finding.js";
import { lintActionModuleCode, lintScriptCode } from "../../utils/scriptEslint.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import type { ActionSource } from "./shared.js";

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  actions_eslint_issue_detected: {
    level: "important",
    description: "ESLint detected a likely correctness issue in the action code.",
    property: "code",
  },
};

export async function checkActionsEslintIssues(
  actions: unknown[],
  options: { isModule?: boolean } = {}
): Promise<Finding[]> {
  const { isModule = false } = options;
  const findings: Finding[] = [];

  for (const action of actions as ActionSource[]) {
    if (!action.name || typeof action.code !== "string") continue;

    const issues = await (isModule
      ? lintActionModuleCode(action.code)
      : lintScriptCode(action.code));
    for (const issue of issues) {
      findings.push(
        buildFinding(
          DEFINITIONS,
          "actions_eslint_issue_detected",
          action.name,
          `code: [${issue.ruleId ?? "parse-error"}] ${issue.message} at line ${issue.line}.`,
          { field: issue.ruleId ?? "parse-error" }
        )
      );
    }
  }

  return findings;
}
