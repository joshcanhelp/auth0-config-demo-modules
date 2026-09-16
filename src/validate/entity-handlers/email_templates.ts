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

// Maps a deploy-cli template type (the file name under the tenant's `emails`
// directory, e.g. "blocked_account") to the display name Auth0 uses for it.
// checkEmailTemplates expects a report against every known template type, not
// just the ones configured, so this also defines the full set to check.
const EMAIL_TEMPLATE_NAMES = _require("auth0-checkmate/analyzer/lib/constants.js")
  .EMAIL_TEMPLATES_NAMES as Record<string, string>;

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
  templatesByType: Record<string, unknown>,
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const findings: Finding[] = [];

  // checkEmailTemplates only reports the "nothing configured" summary when given
  // an empty array - pass one through as-is rather than always sending the full
  // set of known types with every template null.
  const emailTemplates =
    Object.keys(templatesByType).length === 0
      ? []
      : Object.entries(EMAIL_TEMPLATE_NAMES).map(([type, name]) => ({
          name,
          template: templatesByType[type] ?? null,
        }));
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
