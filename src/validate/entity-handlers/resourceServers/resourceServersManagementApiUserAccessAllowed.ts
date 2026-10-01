import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadFlatCheck } from "./shared.js";

const checkManagementAPIUserAccess = loadFlatCheck("checkManagementAPIUserAccess.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  resource_servers_management_api_user_access_allowed: {
    level: "important",
    description:
      "User access to the Management API is unrestricted. Any application's users can obtain Management API tokens.",
    property: "subject_type_authorization.user.policy",
  },
};

export async function checkResourceServersManagementApiUserAccessAllowed(
  resourceServers: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkManagementAPIUserAccess({ resourceServers });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "management_api_user_access_allowed") {
      continue;
    }
    findings.push(
      buildFinding(
        DEFINITIONS,
        "resource_servers_management_api_user_access_allowed",
        item.name ?? "Auth0 Management API",
        "subject_type_authorization.user.policy: User access to the Management API is unrestricted. Any application's users can obtain Management API tokens."
      )
    );
  }

  return findings;
}
