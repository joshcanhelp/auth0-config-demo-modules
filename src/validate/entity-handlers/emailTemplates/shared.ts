import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

export type CheckmateItem = { field: string; status: string; value?: string; attr?: string };
export type CheckmateResult = { details: CheckmateItem[] };
type CheckmateFn = (options: { emailTemplates: unknown[] }) => Promise<CheckmateResult>;

const checkEmailTemplates = _require(
  "auth0-checkmate/analyzer/lib/email_templates/checkEmailTemplates.js"
) as CheckmateFn;

// Maps a deploy-cli template type (the file name under the tenant's `emails` directory, e.g.
// "blocked_account") to the display name Auth0 uses for it. checkEmailTemplates expects a
// report against every known template type, not just the ones configured, so this also
// defines the full set to check.
const EMAIL_TEMPLATE_NAMES = _require("auth0-checkmate/analyzer/lib/constants.js")
  .EMAIL_TEMPLATES_NAMES as Record<string, string>;

export async function runEmailTemplatesCheck(
  templatesByType: Record<string, unknown>
): Promise<CheckmateResult> {
  // checkEmailTemplates only reports the "nothing configured" summary when given an empty
  // array - pass one through as-is rather than always sending the full set of known types
  // with every template null.
  const emailTemplates =
    Object.keys(templatesByType).length === 0
      ? []
      : Object.entries(EMAIL_TEMPLATE_NAMES).map(([type, name]) => ({
          name,
          template: templatesByType[type] ?? null,
        }));

  return checkEmailTemplates({ emailTemplates });
}
