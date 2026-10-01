import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import type { AttackProtectionConfig } from "./shared.js";
import { loadCheck } from "./shared.js";

const checkBruteForce = loadCheck("checkBruteForce.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  attack_protection_brute_force_disabled: {
    level: "important",
    description: "Brute force protection is disabled.",
    property: "brute_force_protection",
  },
};

export async function checkAttackProtectionBruteForceDisabled(
  config: AttackProtectionConfig
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkBruteForce({
    attackProtection: { bruteForceProtection: config.bruteForceProtection },
  });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "disabled") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "attack_protection_brute_force_disabled",
        "Brute Force Protection",
        "brute_force_protection: Brute force protection is disabled."
      )
    );
  }

  return findings;
}
