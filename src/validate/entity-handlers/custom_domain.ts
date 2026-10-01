import { createRequire } from "node:module";

import { buildFinding } from "../finding.js";
import type { Finding, ValidationDefinition } from "../types.js";
import type { TenantTag } from "./clients/index.js";

const _require = createRequire(import.meta.url);

type FlatItem = { field: string; status: string; value?: string };
type FlatResult = { details: FlatItem[] };
type CheckFn = (options: { customDomains: unknown[] }) => Promise<FlatResult>;

const checkCustomDomain = _require(
  "auth0-checkmate/analyzer/lib/custom_domain/checkCustomDomain.js"
) as CheckFn;

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  custom_domain_not_configured: {
    level: "important",
    description: "No custom domain is configured.",
    property: "custom_domains",
  },
  custom_domain_pending_verification: {
    level: "recommended",
    description: "A custom domain is pending verification.",
    property: "custom_domains",
  },
};

export async function validateCustomDomains(
  customDomains: unknown[],
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkCustomDomain({ customDomains });

  for (const item of result.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "not_configured":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "custom_domain_not_configured",
            "Custom Domain",
            "custom_domains: No custom domain is configured."
          )
        );
        break;
      case "pending_verification":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "custom_domain_pending_verification",
            "Custom Domain",
            `custom_domains: Custom domain is pending verification: ${item.value}.`
          )
        );
        break;
      default:
        throw new Error(`Unknown custom domain check field: ${item.field}`);
    }
  }

  return findings;
}
