import { createRequire } from "node:module";

import { buildFinding } from "../finding.js";
import type { Finding, ValidationDefinition } from "../types.js";
import type { TenantTag } from "./clients.js";

const _require = createRequire(import.meta.url);

type FlatItem = { field: string; status: string; value?: string };
type FlatResult = { details: FlatItem[] };
type CheckFn = (options: { errorPageTemplate: string }) => Promise<FlatResult>;

const checkErrorPageTemplate = _require(
  "auth0-checkmate/analyzer/lib/error_page_template/checkErrorPageTemplate.js"
) as CheckFn;

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  error_page_template_raw_filter: {
    level: "critical",
    description:
      "error_page.html: Raw/unescaped filter usage detected - potential XSS vulnerability.",
  },
  error_page_template_unescaped_output: {
    level: "important",
    description:
      "error_page.html: Unescaped variable output detected - potential XSS vulnerability.",
  },
};

export async function validateErrorPageTemplate(
  errorPageTemplate: string,
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkErrorPageTemplate({ errorPageTemplate });

  for (const item of result.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "liquidjs_raw_filter_usage":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "error_page_template_raw_filter",
            "Error Page Template",
            `error_page.html: Raw/unescaped filter usage detected - potential XSS vulnerability: ${item.value}.`
          )
        );
        break;
      case "liquidjs_unescaped_output":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "error_page_template_unescaped_output",
            "Error Page Template",
            `error_page.html: Unescaped variable output detected - potential XSS vulnerability: ${item.value}.`
          )
        );
        break;
      default:
        throw new Error(`Unknown error page template check field: ${item.field}`);
    }
  }

  return findings;
}
