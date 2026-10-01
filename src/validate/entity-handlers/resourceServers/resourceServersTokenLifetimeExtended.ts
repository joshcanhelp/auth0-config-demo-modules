import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadNestedCheck } from "./shared.js";

// checkAPITokenLifetime reports two distinct fields - this one, and
// "token_lifetime_too_long" (see resourceServersTokenLifetimeTooLong.ts). Calling it once
// per field costs a little duplicate work, traded for each validation code having its own
// self-contained file.
const checkAPITokenLifetime = loadNestedCheck("checkAPITokenLifetime.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  resource_servers_token_lifetime_extended: {
    level: "recommended",
    description: "Token lifetime exceeds the 24-hour default.",
    property: "token_lifetime",
  },
};

// Uses WARN (yellow) status, not FAIL (red).
export async function checkResourceServersTokenLifetimeExtended(
  resourceServers: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkAPITokenLifetime({ resourceServers });

  for (const apiReport of result.details) {
    for (const item of apiReport.report) {
      if (item.status !== "yellow" || item.field !== "token_lifetime_extended") continue;
      findings.push(
        buildFinding(
          DEFINITIONS,
          "resource_servers_token_lifetime_extended",
          apiReport.name,
          `token_lifetime: Token lifetime of ${item.value} exceeds the 24-hour default.`
        )
      );
    }
  }

  return findings;
}
