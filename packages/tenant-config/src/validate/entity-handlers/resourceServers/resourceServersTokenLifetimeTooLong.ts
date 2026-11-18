import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadNestedCheck } from "./shared.js";

// checkAPITokenLifetime reports two distinct fields - this one, and
// "token_lifetime_extended" (see resourceServersTokenLifetimeExtended.ts). Calling it once
// per field costs a little duplicate work, traded for each validation code having its own
// self-contained file.
const checkAPITokenLifetime = loadNestedCheck("checkAPITokenLifetime.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  resource_servers_token_lifetime_too_long: {
    level: "important",
    description: "Token lifetime exceeds 7 days.",
    property: "token_lifetime",
  },
};

export async function checkResourceServersTokenLifetimeTooLong(
  resourceServers: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkAPITokenLifetime({ resourceServers });

  for (const apiReport of result.details) {
    for (const item of apiReport.report) {
      if (item.status !== "red" || item.field !== "token_lifetime_too_long") continue;
      findings.push(
        buildFinding(
          DEFINITIONS,
          "resource_servers_token_lifetime_too_long",
          apiReport.name,
          `token_lifetime: Token lifetime of ${item.value} exceeds 7 days.`
        )
      );
    }
  }

  return findings;
}
