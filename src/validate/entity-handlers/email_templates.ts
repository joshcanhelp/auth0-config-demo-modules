import { createRequire } from "node:module";

import { buildFinding } from "../finding.js";
import type { Finding, ValidationDefinition } from "../types.js";
import type { TenantTag } from "./clients.js";

const _require = createRequire(import.meta.url);

type FlatItem = { field: string; status: string; value?: string; attr?: string };
type FlatResult = { details: FlatItem[] };
type CheckFn = (options: { emailTemplates: unknown[] }) => Promise<FlatResult>;

const checkEmailTemplates = _require(
  "auth0-checkmate/analyzer/lib/email_templates/checkEmailTemplates.js"
) as CheckFn;

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  email_templates_not_configured: {
    level: "recommended",
    description: "email_templates: No email templates are configured.",
  },
  email_template_not_configured: {
    level: "recommended",
    description: "email_templates: A specific email template is not configured.",
  },
  email_template_not_enabled: {
    level: "informational",
    description:
      "email_templates: A specific email template is configured but not enabled.",
  },
};

export async function validateEmailTemplates(
  emailTemplates: unknown[],
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkEmailTemplates({ emailTemplates });

  for (const item of result.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "email_templates_not_configured":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "email_templates_not_configured",
            "Email Templates",
            "email_templates: No email templates are configured."
          )
        );
        break;
      case "email_template_not_configured":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "email_template_not_configured",
            item.value ?? "Unknown Template",
            `email_templates: Template "${item.value}" is not configured.`
          )
        );
        break;
      case "email_template_not_enabled":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "email_template_not_enabled",
            item.value ?? "Unknown Template",
            `email_templates: Template "${item.value}" is configured but not enabled.`
          )
        );
        break;
      default:
        throw new Error(`Unknown email template check field: ${item.field}`);
    }
  }

  return findings;
}
