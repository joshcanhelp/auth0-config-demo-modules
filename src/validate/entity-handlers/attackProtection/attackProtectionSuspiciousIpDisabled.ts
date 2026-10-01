import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import type { AttackProtectionConfig } from "./shared.js";
import { loadCheck } from "./shared.js";

const checkSuspiciousIPThrottling = loadCheck("checkSuspiciousIPThrottling.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  attack_protection_suspicious_ip_disabled: {
    level: "important",
    description: "Suspicious IP throttling is disabled.",
    property: "suspicious_ip_throttling",
  },
};

export async function checkAttackProtectionSuspiciousIpDisabled(
  config: AttackProtectionConfig
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkSuspiciousIPThrottling({
    attackProtection: { suspiciousIpThrottling: config.suspiciousIpThrottling },
  });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "disabled") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "attack_protection_suspicious_ip_disabled",
        "Suspicious IP Throttling",
        "suspicious_ip_throttling: Suspicious IP throttling is disabled."
      )
    );
  }

  return findings;
}
