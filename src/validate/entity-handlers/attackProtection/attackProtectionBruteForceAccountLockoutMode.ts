import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import type { AttackProtectionConfig } from "./shared.js";
import { loadCheck } from "./shared.js";

const checkBruteForce = loadCheck("checkBruteForce.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  attack_protection_brute_force_account_lockout_mode: {
    level: "recommended",
    description:
      'Account lockout mode is not "count_per_identifier", which limits user enumeration exposure.',
    property: "brute_force_protection.mode",
  },
};

export async function checkAttackProtectionBruteForceAccountLockoutMode(
  config: AttackProtectionConfig
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkBruteForce({
    attackProtection: { bruteForceProtection: config.bruteForceProtection },
  });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "enableAccountLockout") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "attack_protection_brute_force_account_lockout_mode",
        "Brute Force Protection",
        `brute_force_protection.mode: Account lockout mode is "${item.value}". Consider "count_per_identifier" to limit user enumeration exposure.`
      )
    );
  }

  return findings;
}
