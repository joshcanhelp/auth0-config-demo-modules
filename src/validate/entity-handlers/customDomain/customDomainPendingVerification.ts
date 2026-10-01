import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

const checkCustomDomain = loadCheck("checkCustomDomain.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  custom_domain_pending_verification: {
    level: "recommended",
    description: "A custom domain is pending verification.",
    property: "custom_domains",
  },
};

export async function checkCustomDomainPendingVerification(
  customDomains: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkCustomDomain({ customDomains });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "pending_verification") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "custom_domain_pending_verification",
        "Custom Domain",
        `custom_domains: Custom domain is pending verification: ${item.value}.`
      )
    );
  }

  return findings;
}
