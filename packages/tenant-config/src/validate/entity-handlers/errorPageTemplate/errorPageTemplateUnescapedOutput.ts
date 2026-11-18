import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

const checkErrorPageTemplate = loadCheck("checkErrorPageTemplate.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  error_page_template_unescaped_output: {
    level: "important",
    description: "Unescaped variable output detected - potential XSS vulnerability.",
    property: "error_page.html",
  },
};

export async function checkErrorPageTemplateUnescapedOutput(
  errorPageTemplate: string
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkErrorPageTemplate({ errorPageTemplate });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "liquidjs_unescaped_output") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "error_page_template_unescaped_output",
        "Error Page Template",
        `error_page.html: Unescaped variable output detected - potential XSS vulnerability: ${item.value}.`
      )
    );
  }

  return findings;
}
