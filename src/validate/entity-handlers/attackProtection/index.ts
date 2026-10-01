import type { TenantTag } from "../../utils/tenantTag.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import {
  checkAttackProtectionBreachedPasswordAdminFrequencyInvalid,
  DEFINITIONS as BREACHED_PASSWORD_ADMIN_FREQUENCY_INVALID_DEFINITIONS,
} from "./attackProtectionBreachedPasswordAdminFrequencyInvalid.js";
import {
  checkAttackProtectionBreachedPasswordDisabled,
  DEFINITIONS as BREACHED_PASSWORD_DISABLED_DEFINITIONS,
} from "./attackProtectionBreachedPasswordDisabled.js";
import {
  checkAttackProtectionBreachedPasswordLoginBlockMissing,
  DEFINITIONS as BREACHED_PASSWORD_LOGIN_BLOCK_MISSING_DEFINITIONS,
} from "./attackProtectionBreachedPasswordLoginBlockMissing.js";
import {
  checkAttackProtectionBreachedPasswordMethodInvalid,
  DEFINITIONS as BREACHED_PASSWORD_METHOD_INVALID_DEFINITIONS,
} from "./attackProtectionBreachedPasswordMethodInvalid.js";
import {
  checkAttackProtectionBreachedPasswordMonitoringMode,
  DEFINITIONS as BREACHED_PASSWORD_MONITORING_MODE_DEFINITIONS,
} from "./attackProtectionBreachedPasswordMonitoringMode.js";
import {
  checkAttackProtectionBreachedPasswordPreChangeBlockMissing,
  DEFINITIONS as BREACHED_PASSWORD_PRE_CHANGE_BLOCK_MISSING_DEFINITIONS,
} from "./attackProtectionBreachedPasswordPreChangeBlockMissing.js";
import {
  checkAttackProtectionBreachedPasswordPreUserBlockMissing,
  DEFINITIONS as BREACHED_PASSWORD_PRE_USER_BLOCK_MISSING_DEFINITIONS,
} from "./attackProtectionBreachedPasswordPreUserBlockMissing.js";
import {
  checkAttackProtectionBreachedPasswordShieldsInvalid,
  DEFINITIONS as BREACHED_PASSWORD_SHIELDS_INVALID_DEFINITIONS,
} from "./attackProtectionBreachedPasswordShieldsInvalid.js";
import {
  checkAttackProtectionBruteForceAccountLockoutMode,
  DEFINITIONS as BRUTE_FORCE_ACCOUNT_LOCKOUT_MODE_DEFINITIONS,
} from "./attackProtectionBruteForceAccountLockoutMode.js";
import {
  checkAttackProtectionBruteForceAllowlistPresent,
  DEFINITIONS as BRUTE_FORCE_ALLOWLIST_PRESENT_DEFINITIONS,
} from "./attackProtectionBruteForceAllowlistPresent.js";
import {
  checkAttackProtectionBruteForceDisabled,
  DEFINITIONS as BRUTE_FORCE_DISABLED_DEFINITIONS,
} from "./attackProtectionBruteForceDisabled.js";
import {
  checkAttackProtectionBruteForceShieldsMissing,
  DEFINITIONS as BRUTE_FORCE_SHIELDS_MISSING_DEFINITIONS,
} from "./attackProtectionBruteForceShieldsMissing.js";
import {
  checkAttackProtectionSuspiciousIpAllowlistPresent,
  DEFINITIONS as SUSPICIOUS_IP_ALLOWLIST_PRESENT_DEFINITIONS,
} from "./attackProtectionSuspiciousIpAllowlistPresent.js";
import {
  checkAttackProtectionSuspiciousIpDisabled,
  DEFINITIONS as SUSPICIOUS_IP_DISABLED_DEFINITIONS,
} from "./attackProtectionSuspiciousIpDisabled.js";
import {
  checkAttackProtectionSuspiciousIpShieldsMissing,
  DEFINITIONS as SUSPICIOUS_IP_SHIELDS_MISSING_DEFINITIONS,
} from "./attackProtectionSuspiciousIpShieldsMissing.js";
import type { AttackProtectionConfig } from "./shared.js";

export type { AttackProtectionConfig };

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  ...BREACHED_PASSWORD_DISABLED_DEFINITIONS,
  ...BREACHED_PASSWORD_LOGIN_BLOCK_MISSING_DEFINITIONS,
  ...BREACHED_PASSWORD_PRE_USER_BLOCK_MISSING_DEFINITIONS,
  ...BREACHED_PASSWORD_PRE_CHANGE_BLOCK_MISSING_DEFINITIONS,
  ...BREACHED_PASSWORD_SHIELDS_INVALID_DEFINITIONS,
  ...BREACHED_PASSWORD_ADMIN_FREQUENCY_INVALID_DEFINITIONS,
  ...BREACHED_PASSWORD_METHOD_INVALID_DEFINITIONS,
  ...BREACHED_PASSWORD_MONITORING_MODE_DEFINITIONS,
  ...BRUTE_FORCE_DISABLED_DEFINITIONS,
  ...BRUTE_FORCE_SHIELDS_MISSING_DEFINITIONS,
  ...BRUTE_FORCE_ALLOWLIST_PRESENT_DEFINITIONS,
  ...BRUTE_FORCE_ACCOUNT_LOCKOUT_MODE_DEFINITIONS,
  ...SUSPICIOUS_IP_DISABLED_DEFINITIONS,
  ...SUSPICIOUS_IP_SHIELDS_MISSING_DEFINITIONS,
  ...SUSPICIOUS_IP_ALLOWLIST_PRESENT_DEFINITIONS,
};

// Skipped checks for attack protection:
// - checkBotDetectionSetting: its expected field names don't match the auth0-deploy-cli
//   export format (e.g. "policy" vs "challenge_password_policy")

export async function validateAttackProtection(
  config: AttackProtectionConfig,
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const results = await Promise.all([
    checkAttackProtectionBreachedPasswordDisabled(config),
    checkAttackProtectionBreachedPasswordLoginBlockMissing(config),
    checkAttackProtectionBreachedPasswordPreUserBlockMissing(config),
    checkAttackProtectionBreachedPasswordPreChangeBlockMissing(config),
    checkAttackProtectionBreachedPasswordShieldsInvalid(config),
    checkAttackProtectionBreachedPasswordAdminFrequencyInvalid(config),
    checkAttackProtectionBreachedPasswordMethodInvalid(config),
    checkAttackProtectionBreachedPasswordMonitoringMode(config),
    checkAttackProtectionBruteForceDisabled(config),
    checkAttackProtectionBruteForceShieldsMissing(config),
    checkAttackProtectionBruteForceAllowlistPresent(config),
    checkAttackProtectionBruteForceAccountLockoutMode(config),
    checkAttackProtectionSuspiciousIpDisabled(config),
    checkAttackProtectionSuspiciousIpShieldsMissing(config),
    checkAttackProtectionSuspiciousIpAllowlistPresent(config),
  ]);

  return results.flat();
}
