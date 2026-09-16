import { createRequire } from "node:module";

import { buildFinding } from "../finding.js";
import type { Finding, ValidationDefinition } from "../types.js";
import type { TenantTag } from "./clients.js";

const _require = createRequire(import.meta.url);

type FlatItem = { field: string; status: string; value?: string | number | boolean };
type FlatResult = { details: FlatItem[] };
type CheckFn = (options: { attackProtection: unknown }) => Promise<FlatResult>;

function loadCheck(filename: string): CheckFn {
  return _require(
    `auth0-checkmate/analyzer/lib/attack_protection/${filename}`
  ) as CheckFn;
}

// Note: checkBotDetectionSetting is skipped - its expected field names don't match
// the auth0-deploy-cli export format (e.g. "policy" vs "challenge_password_policy")
// const checkBotDetectionSetting = loadCheck("checkBotDetectionSetting.js");
const checkBreachedPassword = loadCheck("checkBreachedPassword.js");
const checkBruteForce = loadCheck("checkBruteForce.js");
const checkSuspiciousIPThrottling = loadCheck("checkSuspiciousIPThrottling.js");

export interface AttackProtectionConfig {
  breachedPasswordDetection?: unknown;
  bruteForceProtection?: unknown;
  suspiciousIpThrottling?: unknown;
}

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  attack_protection_breached_password_disabled: {
    level: "important",
    description: "breached_password_detection: Breached password detection is disabled.",
  },
  attack_protection_breached_password_login_block_missing: {
    level: "important",
    description: "breached_password_detection: Block shield is not configured for login.",
  },
  attack_protection_breached_password_pre_user_block_missing: {
    level: "important",
    description:
      "breached_password_detection.stage.pre-user-registration: Block shield is not configured.",
  },
  attack_protection_breached_password_pre_change_block_missing: {
    level: "important",
    description:
      "breached_password_detection.stage.pre-change-password: Block shield is not configured.",
  },
  attack_protection_breached_password_shields_invalid: {
    level: "recommended",
    description: "breached_password_detection.shields: Invalid shield values configured.",
  },
  attack_protection_breached_password_admin_frequency_invalid: {
    level: "recommended",
    description:
      "breached_password_detection.admin_notification_frequency: Invalid notification frequency.",
  },
  attack_protection_breached_password_method_invalid: {
    level: "recommended",
    description:
      "breached_password_detection.method: Invalid detection method configured.",
  },
  attack_protection_breached_password_monitoring_mode: {
    level: "important",
    description:
      "breached_password_detection: Detection is enabled but no shields are configured (monitoring mode only).",
  },
  attack_protection_brute_force_disabled: {
    level: "important",
    description: "brute_force_protection: Brute force protection is disabled.",
  },
  attack_protection_brute_force_shields_missing: {
    level: "important",
    description: "brute_force_protection.shields: Required shields are missing.",
  },
  attack_protection_brute_force_allowlist_present: {
    level: "recommended",
    description:
      "brute_force_protection.allowlist: Allowlist is configured with entries.",
  },
  attack_protection_brute_force_account_lockout_mode: {
    level: "recommended",
    description:
      'brute_force_protection.mode: Account lockout mode is not "count_per_identifier", which limits user enumeration exposure.',
  },
  attack_protection_suspicious_ip_disabled: {
    level: "important",
    description: "suspicious_ip_throttling: Suspicious IP throttling is disabled.",
  },
  attack_protection_suspicious_ip_shields_missing: {
    level: "important",
    description: "suspicious_ip_throttling.shields: Required shields are missing.",
  },
  attack_protection_suspicious_ip_allowlist_present: {
    level: "recommended",
    description:
      "suspicious_ip_throttling.allowlist: Allowlist is configured with entries.",
  },
};

export async function validateAttackProtection(
  config: AttackProtectionConfig,
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const findings: Finding[] = [];

  const [breachedResult, bruteResult, suspiciousResult] = await Promise.all([
    checkBreachedPassword({
      attackProtection: { breachedPasswordDetection: config.breachedPasswordDetection },
    }),
    checkBruteForce({
      attackProtection: { bruteForceProtection: config.bruteForceProtection },
    }),
    checkSuspiciousIPThrottling({
      attackProtection: { suspiciousIpThrottling: config.suspiciousIpThrottling },
    }),
  ]);

  for (const item of breachedResult.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "disabled":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "attack_protection_breached_password_disabled",
            "Breached Password Detection",
            "breached_password_detection: Breached password detection is disabled."
          )
        );
        break;
      case "stage_login_shields_block_not_configured":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "attack_protection_breached_password_login_block_missing",
            "Breached Password Detection",
            "breached_password_detection: Block shield is not configured for login."
          )
        );
        break;
      case "stage_pre_user_shields_block_not_configured":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "attack_protection_breached_password_pre_user_block_missing",
            "Breached Password Detection",
            "breached_password_detection.stage.pre-user-registration: Block shield is not configured."
          )
        );
        break;
      case "stage_pre_change_password_shields_block_not_configured":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "attack_protection_breached_password_pre_change_block_missing",
            "Breached Password Detection",
            "breached_password_detection.stage.pre-change-password: Block shield is not configured."
          )
        );
        break;
      case "shields_invalid_values":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "attack_protection_breached_password_shields_invalid",
            "Breached Password Detection",
            "breached_password_detection.shields: Invalid shield values configured."
          )
        );
        break;
      case "admin_frequency_invalid_values":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "attack_protection_breached_password_admin_frequency_invalid",
            "Breached Password Detection",
            `breached_password_detection.admin_notification_frequency: Invalid notification frequency: ${item.value}.`
          )
        );
        break;
      case "method_invalid_value":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "attack_protection_breached_password_method_invalid",
            "Breached Password Detection",
            "breached_password_detection.method: Invalid detection method configured."
          )
        );
        break;
      case "monitoring_mode":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "attack_protection_breached_password_monitoring_mode",
            "Breached Password Detection",
            "breached_password_detection: Detection is enabled but no shields are configured (monitoring mode only)."
          )
        );
        break;
      default:
        throw new Error(`Unknown attack protection check field: ${item.field}`);
    }
  }

  for (const item of bruteResult.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "disabled":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "attack_protection_brute_force_disabled",
            "Brute Force Protection",
            "brute_force_protection: Brute force protection is disabled."
          )
        );
        break;
      case "shieldsMissing":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "attack_protection_brute_force_shields_missing",
            "Brute Force Protection",
            `brute_force_protection.shields: Required shields are missing: ${item.value}.`
          )
        );
        break;
      case "allowlistPresent":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "attack_protection_brute_force_allowlist_present",
            "Brute Force Protection",
            `brute_force_protection.allowlist: Allowlist is configured with entries: ${item.value}.`
          )
        );
        break;
      case "enableAccountLockout":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "attack_protection_brute_force_account_lockout_mode",
            "Brute Force Protection",
            `brute_force_protection.mode: Account lockout mode is "${item.value}". Consider "count_per_identifier" to limit user enumeration exposure.`
          )
        );
        break;
      default:
        throw new Error(`Unknown attack protection check field: ${item.field}`);
    }
  }

  for (const item of suspiciousResult.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "disabled":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "attack_protection_suspicious_ip_disabled",
            "Suspicious IP Throttling",
            "suspicious_ip_throttling: Suspicious IP throttling is disabled."
          )
        );
        break;
      case "shieldsMissing":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "attack_protection_suspicious_ip_shields_missing",
            "Suspicious IP Throttling",
            `suspicious_ip_throttling.shields: Required shields are missing: ${item.value}.`
          )
        );
        break;
      case "allowlistPresent":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "attack_protection_suspicious_ip_allowlist_present",
            "Suspicious IP Throttling",
            `suspicious_ip_throttling.allowlist: Allowlist is configured with entries: ${item.value}.`
          )
        );
        break;
      default:
        throw new Error(`Unknown attack protection check field: ${item.field}`);
    }
  }

  return findings;
}
