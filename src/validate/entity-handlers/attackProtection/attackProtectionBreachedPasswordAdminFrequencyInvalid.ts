import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import type { AttackProtectionConfig } from "./shared.js";
import { loadCheck } from "./shared.js";

const checkBreachedPassword = loadCheck("checkBreachedPassword.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  attack_protection_breached_password_admin_frequency_invalid: {
    level: "recommended",
    description: "Invalid notification frequency.",
    property: "breached_password_detection.admin_notification_frequency",
  },
};

export async function checkAttackProtectionBreachedPasswordAdminFrequencyInvalid(
  config: AttackProtectionConfig
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkBreachedPassword({
    attackProtection: { breachedPasswordDetection: config.breachedPasswordDetection },
  });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "admin_frequency_invalid_values") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "attack_protection_breached_password_admin_frequency_invalid",
        "Breached Password Detection",
        `breached_password_detection.admin_notification_frequency: Invalid notification frequency: ${item.value}.`
      )
    );
  }

  return findings;
}
