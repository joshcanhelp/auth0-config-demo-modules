import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import type { AttackProtectionConfig } from "./shared.js";
import { loadCheck } from "./shared.js";

const checkBreachedPassword = loadCheck("checkBreachedPassword.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  attack_protection_breached_password_login_block_missing: {
    level: "important",
    description: "Block shield is not configured for login.",
    property: "breached_password_detection",
  },
};

export async function checkAttackProtectionBreachedPasswordLoginBlockMissing(
  config: AttackProtectionConfig
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkBreachedPassword({
    attackProtection: { breachedPasswordDetection: config.breachedPasswordDetection },
  });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "stage_login_shields_block_not_configured") {
      continue;
    }
    findings.push(
      buildFinding(
        DEFINITIONS,
        "attack_protection_breached_password_login_block_missing",
        "Breached Password Detection",
        "breached_password_detection: Block shield is not configured for login."
      )
    );
  }

  return findings;
}
