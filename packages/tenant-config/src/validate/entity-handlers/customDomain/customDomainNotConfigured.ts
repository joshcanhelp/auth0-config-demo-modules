import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

const checkCustomDomain = loadCheck("checkCustomDomain.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  custom_domain_not_configured: {
    level: "important",
    description: "No custom domain is configured.",
    property: "custom_domains",
  },
};

export async function checkCustomDomainNotConfigured(
  customDomains: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkCustomDomain({ customDomains });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "not_configured") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "custom_domain_not_configured",
        "Custom Domain",
        "custom_domains: No custom domain is configured."
      )
    );
  }

  return findings;
}
