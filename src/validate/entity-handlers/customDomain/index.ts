import type { TenantTag } from "../../utils/tenantTag.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import {
  checkCustomDomainNotConfigured,
  DEFINITIONS as NOT_CONFIGURED_DEFINITIONS,
} from "./customDomainNotConfigured.js";
import {
  checkCustomDomainPendingVerification,
  DEFINITIONS as PENDING_VERIFICATION_DEFINITIONS,
} from "./customDomainPendingVerification.js";

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  ...NOT_CONFIGURED_DEFINITIONS,
  ...PENDING_VERIFICATION_DEFINITIONS,
};

export async function validateCustomDomains(
  customDomains: unknown[],
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const results = await Promise.all([
    checkCustomDomainNotConfigured(customDomains),
    checkCustomDomainPendingVerification(customDomains),
  ]);

  return results.flat();
}
