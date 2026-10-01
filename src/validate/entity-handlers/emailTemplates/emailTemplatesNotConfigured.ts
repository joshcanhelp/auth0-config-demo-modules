import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { runEmailTemplatesCheck } from "./shared.js";

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  email_templates_not_configured: {
    level: "recommended",
    description: "No email templates are configured.",
    property: "email_templates",
  },
};

export async function checkEmailTemplatesNotConfigured(
  templatesByType: Record<string, unknown>
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await runEmailTemplatesCheck(templatesByType);

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "email_templates_not_configured") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "email_templates_not_configured",
        "Email Templates",
        "email_templates: No email templates are configured."
      )
    );
  }

  return findings;
}
