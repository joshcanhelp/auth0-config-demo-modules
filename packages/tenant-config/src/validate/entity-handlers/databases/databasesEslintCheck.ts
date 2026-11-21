import { buildFinding } from "../../utils/finding.js";
import { lintDatabaseScriptCode } from "../../utils/scriptEslint.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  databases_eslint_issue_detected: {
    level: "important",
    description:
      "ESLint detected a likely correctness issue in a custom database script.",
    property: "customScripts",
  },
};

type DatabaseSource = {
  name?: string;
  options?: { customScripts?: Record<string, unknown> };
};

export async function checkDatabasesEslintIssues(
  databases: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];

  for (const database of databases as DatabaseSource[]) {
    if (!database.name) continue;
    const customScripts = database.options?.customScripts;
    if (!customScripts) continue;

    for (const [scriptName, code] of Object.entries(customScripts)) {
      if (typeof code !== "string") continue;

      const issues = await lintDatabaseScriptCode(code);
      for (const issue of issues) {
        findings.push(
          buildFinding(
            DEFINITIONS,
            "databases_eslint_issue_detected",
            database.name,
            `customScripts.${scriptName}: [${issue.ruleId ?? "parse-error"}] ${issue.message} at line ${issue.line}.`,
            { field: issue.ruleId ?? "parse-error" }
          )
        );
      }
    }
  }

  return findings;
}
