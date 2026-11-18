import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import type { AttackProtectionConfig } from "./shared.js";
import { loadCheck } from "./shared.js";

const checkSuspiciousIPThrottling = loadCheck("checkSuspiciousIPThrottling.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  attack_protection_suspicious_ip_shields_missing: {
    level: "important",
    description: "Required shields are missing.",
    property: "suspicious_ip_throttling.shields",
  },
};

export async function checkAttackProtectionSuspiciousIpShieldsMissing(
  config: AttackProtectionConfig
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkSuspiciousIPThrottling({
    attackProtection: { suspiciousIpThrottling: config.suspiciousIpThrottling },
  });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "shieldsMissing") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "attack_protection_suspicious_ip_shields_missing",
        "Suspicious IP Throttling",
        `suspicious_ip_throttling.shields: Required shields are missing: ${item.value}.`
      )
    );
  }

  return findings;
}
