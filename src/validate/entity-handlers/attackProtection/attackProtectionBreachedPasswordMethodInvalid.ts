import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import type { AttackProtectionConfig } from "./shared.js";
import { loadCheck } from "./shared.js";

const checkBreachedPassword = loadCheck("checkBreachedPassword.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  attack_protection_breached_password_method_invalid: {
    level: "recommended",
    description: "Invalid detection method configured.",
    property: "breached_password_detection.method",
  },
};

export async function checkAttackProtectionBreachedPasswordMethodInvalid(
  config: AttackProtectionConfig
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkBreachedPassword({
    attackProtection: { breachedPasswordDetection: config.breachedPasswordDetection },
  });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "method_invalid_value") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "attack_protection_breached_password_method_invalid",
        "Breached Password Detection",
        "breached_password_detection.method: Invalid detection method configured."
      )
    );
  }

  return findings;
}
