import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import type { AttackProtectionConfig } from "./shared.js";
import { loadCheck } from "./shared.js";

const checkBreachedPassword = loadCheck("checkBreachedPassword.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  attack_protection_breached_password_disabled: {
    level: "important",
    description: "Breached password detection is disabled.",
    property: "breached_password_detection",
  },
};

export async function checkAttackProtectionBreachedPasswordDisabled(
  config: AttackProtectionConfig
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkBreachedPassword({
    attackProtection: { breachedPasswordDetection: config.breachedPasswordDetection },
  });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "disabled") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "attack_protection_breached_password_disabled",
        "Breached Password Detection",
        "breached_password_detection: Breached password detection is disabled."
      )
    );
  }

  return findings;
}
