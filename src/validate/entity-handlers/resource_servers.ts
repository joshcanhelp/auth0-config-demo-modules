import { createRequire } from "node:module";

import { buildFinding } from "../finding.js";
import type { Finding, ValidationDefinition } from "../types.js";
import type { TenantTag } from "./clients.js";

const _require = createRequire(import.meta.url);

type FlatItem = { name?: string; field: string; status: string; value?: string };
type NestedReport = { name: string; report: FlatItem[] };
type FlatResult = { details: FlatItem[] };
type NestedResult = { details: NestedReport[] };

type FlatFn = (options: { resourceServers: unknown[] }) => Promise<FlatResult>;
type NestedFn = (options: { resourceServers: unknown[] }) => Promise<NestedResult>;

function loadFlatCheck(filename: string): FlatFn {
  return _require(`auth0-checkmate/analyzer/lib/resource_servers/${filename}`) as FlatFn;
}

function loadNestedCheck(filename: string): NestedFn {
  return _require(
    `auth0-checkmate/analyzer/lib/resource_servers/${filename}`
  ) as NestedFn;
}

const checkAPIAuthorizationPolicy = loadNestedCheck("checkAPIAuthorizationPolicy.js");
const checkAPISigningAlgorithm = loadNestedCheck("checkAPISigningAlgorithm.js");
const checkAPITokenLifetime = loadNestedCheck("checkAPITokenLifetime.js");
const checkManagementAPIUserAccess = loadFlatCheck("checkManagementAPIUserAccess.js");
// checkAPITokenSenderConstraining is skipped - fails for most tenants without proof_of_possession configured
// const checkAPITokenSenderConstraining = loadNestedCheck("checkAPITokenSenderConstraining.js");
// checkJWEResourceServer is skipped - only available on tenants with the HRI add-on
// const checkJWEResourceServer = loadNestedCheck("checkJWEResourceServer.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  resource_servers_api_access_unrestricted: {
    level: "recommended",
    description:
      'subject_type_authorization.user.policy: User access to the API is unrestricted. Consider "require_client_grant".',
  },
  resource_servers_symmetric_signing_alg: {
    level: "important",
    description:
      "signing_alg: API tokens are signed with HS256, a symmetric algorithm. Use RS256 or another asymmetric algorithm.",
  },
  resource_servers_token_lifetime_too_long: {
    level: "important",
    description: "token_lifetime: Token lifetime exceeds 7 days.",
  },
  resource_servers_token_lifetime_extended: {
    level: "recommended",
    description: "token_lifetime: Token lifetime exceeds the 24-hour default.",
  },
  resource_servers_management_api_user_access_allowed: {
    level: "important",
    description:
      "subject_type_authorization.user.policy: User access to the Management API is unrestricted. Any application's users can obtain Management API tokens.",
  },
};

export async function validateResourceServers(
  resourceServers: unknown[],
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const findings: Finding[] = [];

  const [authPolicyResult, signingAlgResult, tokenLifetimeResult, mgmtApiResult] =
    await Promise.all([
      checkAPIAuthorizationPolicy({ resourceServers }),
      checkAPISigningAlgorithm({ resourceServers }),
      checkAPITokenLifetime({ resourceServers }),
      checkManagementAPIUserAccess({ resourceServers }),
    ]);

  // Uses WARN (yellow) status for unrestricted access
  for (const apiReport of authPolicyResult.details) {
    for (const item of apiReport.report) {
      if (item.status !== "yellow") continue;
      switch (item.field) {
        case "api_access_unrestricted":
          findings.push(
            buildFinding(
              DEFINITIONS,
              "resource_servers_api_access_unrestricted",
              apiReport.name,
              `subject_type_authorization.user.policy: User access to "${item.value}" is unrestricted. Consider "require_client_grant".`
            )
          );
          break;
      }
    }
  }

  for (const apiReport of signingAlgResult.details) {
    for (const item of apiReport.report) {
      if (item.status !== "red") continue;
      switch (item.field) {
        case "using_symmetric_alg":
          findings.push(
            buildFinding(
              DEFINITIONS,
              "resource_servers_symmetric_signing_alg",
              apiReport.name,
              "signing_alg: API tokens are signed with HS256, a symmetric algorithm. Use RS256 or another asymmetric algorithm."
            )
          );
          break;
        default:
          throw new Error(`Unknown resource server check field: ${item.field}`);
      }
    }
  }

  for (const apiReport of tokenLifetimeResult.details) {
    for (const item of apiReport.report) {
      if (item.status === "red") {
        switch (item.field) {
          case "token_lifetime_too_long":
            findings.push(
              buildFinding(
                DEFINITIONS,
                "resource_servers_token_lifetime_too_long",
                apiReport.name,
                `token_lifetime: Token lifetime of ${item.value} exceeds 7 days.`
              )
            );
            break;
          default:
            throw new Error(`Unknown resource server check field: ${item.field}`);
        }
      } else if (item.status === "yellow") {
        switch (item.field) {
          case "token_lifetime_extended":
            findings.push(
              buildFinding(
                DEFINITIONS,
                "resource_servers_token_lifetime_extended",
                apiReport.name,
                `token_lifetime: Token lifetime of ${item.value} exceeds the 24-hour default.`
              )
            );
            break;
        }
      }
    }
  }

  // Flat result - items have name directly on them
  for (const item of mgmtApiResult.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "management_api_user_access_allowed":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "resource_servers_management_api_user_access_allowed",
            item.name ?? "Auth0 Management API",
            "subject_type_authorization.user.policy: User access to the Management API is unrestricted. Any application's users can obtain Management API tokens."
          )
        );
        break;
      default:
        throw new Error(`Unknown resource server check field: ${item.field}`);
    }
  }

  return findings;
}
