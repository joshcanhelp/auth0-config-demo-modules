import type { TenantTag } from "../../utils/tenantTag.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import {
  checkResourceServersApiAccessUnrestricted,
  DEFINITIONS as API_ACCESS_UNRESTRICTED_DEFINITIONS,
} from "./resourceServersApiAccessUnrestricted.js";
import {
  checkResourceServersManagementApiUserAccessAllowed,
  DEFINITIONS as MANAGEMENT_API_USER_ACCESS_ALLOWED_DEFINITIONS,
} from "./resourceServersManagementApiUserAccessAllowed.js";
import {
  checkResourceServersSymmetricSigningAlg,
  DEFINITIONS as SYMMETRIC_SIGNING_ALG_DEFINITIONS,
} from "./resourceServersSymmetricSigningAlg.js";
import {
  checkResourceServersTokenLifetimeExtended,
  DEFINITIONS as TOKEN_LIFETIME_EXTENDED_DEFINITIONS,
} from "./resourceServersTokenLifetimeExtended.js";
import {
  checkResourceServersTokenLifetimeTooLong,
  DEFINITIONS as TOKEN_LIFETIME_TOO_LONG_DEFINITIONS,
} from "./resourceServersTokenLifetimeTooLong.js";

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  ...API_ACCESS_UNRESTRICTED_DEFINITIONS,
  ...SYMMETRIC_SIGNING_ALG_DEFINITIONS,
  ...TOKEN_LIFETIME_TOO_LONG_DEFINITIONS,
  ...TOKEN_LIFETIME_EXTENDED_DEFINITIONS,
  ...MANAGEMENT_API_USER_ACCESS_ALLOWED_DEFINITIONS,
};

// Skipped checks for resource servers:
// - checkAPITokenSenderConstraining: fails for most tenants without proof_of_possession
//   configured
// - checkJWEResourceServer: only available on tenants with the HRI add-on

export async function validateResourceServers(
  resourceServers: unknown[],
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const results = await Promise.all([
    checkResourceServersApiAccessUnrestricted(resourceServers),
    checkResourceServersSymmetricSigningAlg(resourceServers),
    checkResourceServersTokenLifetimeTooLong(resourceServers),
    checkResourceServersTokenLifetimeExtended(resourceServers),
    checkResourceServersManagementApiUserAccessAllowed(resourceServers),
  ]);

  return results.flat();
}
