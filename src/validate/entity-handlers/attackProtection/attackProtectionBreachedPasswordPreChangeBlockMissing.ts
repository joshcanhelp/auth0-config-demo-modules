import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import type { AttackProtectionConfig } from "./shared.js";
import { loadCheck } from "./shared.js";

const checkBreachedPassword = loadCheck("checkBreachedPassword.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  attack_protection_breached_password_pre_change_block_missing: {
    level: "important",
    description: "Block shield is not configured.",
    property: "breached_password_detection.stage.pre-change-password",
  },
};

export async function checkAttackProtectionBreachedPasswordPreChangeBlockMissing(
  config: AttackProtectionConfig
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkBreachedPassword({
    attackProtection: { breachedPasswordDetection: config.breachedPasswordDetection },
  });

  for (const item of result.details) {
    if (
      item.status !== "red" ||
      item.field !== "stage_pre_change_password_shields_block_not_configured"
    ) {
      continue;
    }
    findings.push(
      buildFinding(
        DEFINITIONS,
        "attack_protection_breached_password_pre_change_block_missing",
        "Breached Password Detection",
        "breached_password_detection.stage.pre-change-password: Block shield is not configured."
      )
    );
  }

  return findings;
}
