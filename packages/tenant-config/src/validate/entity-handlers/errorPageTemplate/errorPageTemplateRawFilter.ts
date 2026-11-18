import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

const checkErrorPageTemplate = loadCheck("checkErrorPageTemplate.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  error_page_template_raw_filter: {
    level: "critical",
    description: "Raw/unescaped filter usage detected - potential XSS vulnerability.",
    property: "error_page.html",
  },
};

export async function checkErrorPageTemplateRawFilter(
  errorPageTemplate: string
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkErrorPageTemplate({ errorPageTemplate });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "liquidjs_raw_filter_usage") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "error_page_template_raw_filter",
        "Error Page Template",
        `error_page.html: Raw/unescaped filter usage detected - potential XSS vulnerability: ${item.value}.`
      )
    );
  }

  return findings;
}
