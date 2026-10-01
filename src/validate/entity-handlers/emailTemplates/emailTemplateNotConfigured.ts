import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { runEmailTemplatesCheck } from "./shared.js";

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  email_template_not_configured: {
    level: "recommended",
    description: "A specific email template is not configured.",
    property: "email_templates",
  },
};

export async function checkEmailTemplateNotConfigured(
  templatesByType: Record<string, unknown>
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await runEmailTemplatesCheck(templatesByType);

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "email_template_not_configured") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "email_template_not_configured",
        item.value ?? "Unknown Template",
        `email_templates: Template "${item.value}" is not configured.`
      )
    );
  }

  return findings;
}
