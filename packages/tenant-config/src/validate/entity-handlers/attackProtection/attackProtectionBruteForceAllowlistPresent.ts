import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import type { AttackProtectionConfig } from "./shared.js";
import { loadCheck } from "./shared.js";

const checkBruteForce = loadCheck("checkBruteForce.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  attack_protection_brute_force_allowlist_present: {
    level: "recommended",
    description: "Allowlist is configured with entries.",
    property: "brute_force_protection.allowlist",
  },
};

export async function checkAttackProtectionBruteForceAllowlistPresent(
  config: AttackProtectionConfig
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkBruteForce({
    attackProtection: { bruteForceProtection: config.bruteForceProtection },
  });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "allowlistPresent") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "attack_protection_brute_force_allowlist_present",
        "Brute Force Protection",
        `brute_force_protection.allowlist: Allowlist is configured with entries: ${item.value}.`
      )
    );
  }

  return findings;
}
