import type { TenantTag } from "../../utils/tenantTag.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import {
  checkDatabasesExternalUserStore,
  DEFINITIONS as EXTERNAL_USER_STORE_DEFINITIONS,
} from "./databasesExternalUserStore.js";
import {
  checkDatabasesFlexibleIdentifiersDisabled,
  DEFINITIONS as FLEXIBLE_IDENTIFIERS_DISABLED_DEFINITIONS,
} from "./databasesFlexibleIdentifiersDisabled.js";
import {
  checkDatabasesHardCodedValueDetected,
  DEFINITIONS as HARD_CODED_VALUE_DETECTED_DEFINITIONS,
} from "./databasesHardCodedValueDetected.js";
import {
  checkDatabasesOnlyPasswordMethod,
  DEFINITIONS as ONLY_PASSWORD_METHOD_DEFINITIONS,
} from "./databasesOnlyPasswordMethod.js";
import {
  checkDatabasesPasswordComplexityNotConfigured,
  DEFINITIONS as PASSWORD_COMPLEXITY_NOT_CONFIGURED_DEFINITIONS,
} from "./databasesPasswordComplexityNotConfigured.js";
import {
  checkDatabasesPasswordHistoryDisabled,
  DEFINITIONS as PASSWORD_HISTORY_DISABLED_DEFINITIONS,
} from "./databasesPasswordHistoryDisabled.js";
import {
  checkDatabasesPasswordMinLength,
  DEFINITIONS as PASSWORD_MIN_LENGTH_DEFINITIONS,
} from "./databasesPasswordMinLength.js";
import {
  checkDatabasesPasswordNoPersonalInfoDisabled,
  DEFINITIONS as PASSWORD_NO_PERSONAL_INFO_DISABLED_DEFINITIONS,
} from "./databasesPasswordNoPersonalInfoDisabled.js";
import {
  checkDatabasesPasswordPolicyMissing,
  DEFINITIONS as PASSWORD_POLICY_MISSING_DEFINITIONS,
} from "./databasesPasswordPolicyMissing.js";
import {
  checkDatabasesPasswordPolicyWeak,
  DEFINITIONS as PASSWORD_POLICY_WEAK_DEFINITIONS,
} from "./databasesPasswordPolicyWeak.js";
import {
  checkDatabasesVerificationByLinkMethod,
  DEFINITIONS as VERIFICATION_BY_LINK_METHOD_DEFINITIONS,
} from "./databasesVerificationByLinkMethod.js";

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  ...ONLY_PASSWORD_METHOD_DEFINITIONS,
  ...HARD_CODED_VALUE_DETECTED_DEFINITIONS,
  ...FLEXIBLE_IDENTIFIERS_DISABLED_DEFINITIONS,
  ...VERIFICATION_BY_LINK_METHOD_DEFINITIONS,
  ...EXTERNAL_USER_STORE_DEFINITIONS,
  ...PASSWORD_MIN_LENGTH_DEFINITIONS,
  ...PASSWORD_COMPLEXITY_NOT_CONFIGURED_DEFINITIONS,
  ...PASSWORD_HISTORY_DISABLED_DEFINITIONS,
  ...PASSWORD_NO_PERSONAL_INFO_DISABLED_DEFINITIONS,
  ...PASSWORD_POLICY_WEAK_DEFINITIONS,
  ...PASSWORD_POLICY_MISSING_DEFINITIONS,
};

// Skipped checks for databases:
// - checkPromotedDBConnection: emits FAIL regardless of configuration

export async function validateDatabases(
  databases: unknown[],
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const results = await Promise.all([
    checkDatabasesOnlyPasswordMethod(databases),
    checkDatabasesHardCodedValueDetected(databases),
    checkDatabasesFlexibleIdentifiersDisabled(databases),
    checkDatabasesVerificationByLinkMethod(databases),
    checkDatabasesExternalUserStore(databases),
    checkDatabasesPasswordMinLength(databases),
    checkDatabasesPasswordComplexityNotConfigured(databases),
    checkDatabasesPasswordHistoryDisabled(databases),
    checkDatabasesPasswordNoPersonalInfoDisabled(databases),
    checkDatabasesPasswordPolicyWeak(databases),
    checkDatabasesPasswordPolicyMissing(databases),
  ]);

  return results.flat();
}
