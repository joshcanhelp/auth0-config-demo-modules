import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadNestedCheck } from "./shared.js";

const checkAPIAuthorizationPolicy = loadNestedCheck("checkAPIAuthorizationPolicy.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  resource_servers_api_access_unrestricted: {
    level: "recommended",
    description:
      'User access to the API is unrestricted. Consider "require_client_grant".',
    property: "subject_type_authorization.user.policy",
  },
};

// Uses WARN (yellow) status, not FAIL (red).
export async function checkResourceServersApiAccessUnrestricted(
  resourceServers: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkAPIAuthorizationPolicy({ resourceServers });

  for (const apiReport of result.details) {
    for (const item of apiReport.report) {
      if (item.status !== "yellow" || item.field !== "api_access_unrestricted") continue;
      findings.push(
        buildFinding(
          DEFINITIONS,
          "resource_servers_api_access_unrestricted",
          apiReport.name,
          `subject_type_authorization.user.policy: User access to "${item.value}" is unrestricted. Consider "require_client_grant".`
        )
      );
    }
  }

  return findings;
}
