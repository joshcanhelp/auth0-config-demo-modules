import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import type { AttackProtectionConfig } from "./shared.js";
import { loadCheck } from "./shared.js";

const checkBruteForce = loadCheck("checkBruteForce.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  attack_protection_brute_force_shields_missing: {
    level: "important",
    description: "Required shields are missing.",
    property: "brute_force_protection.shields",
  },
};

export async function checkAttackProtectionBruteForceShieldsMissing(
  config: AttackProtectionConfig
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkBruteForce({
    attackProtection: { bruteForceProtection: config.bruteForceProtection },
  });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "shieldsMissing") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "attack_protection_brute_force_shields_missing",
        "Brute Force Protection",
        `brute_force_protection.shields: Required shields are missing: ${item.value}.`
      )
    );
  }

  return findings;
}
