import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import type { AttackProtectionConfig } from "./shared.js";
import { loadCheck } from "./shared.js";

const checkSuspiciousIPThrottling = loadCheck("checkSuspiciousIPThrottling.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  attack_protection_suspicious_ip_allowlist_present: {
    level: "recommended",
    description: "Allowlist is configured with entries.",
    property: "suspicious_ip_throttling.allowlist",
  },
};

export async function checkAttackProtectionSuspiciousIpAllowlistPresent(
  config: AttackProtectionConfig
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkSuspiciousIPThrottling({
    attackProtection: { suspiciousIpThrottling: config.suspiciousIpThrottling },
  });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "allowlistPresent") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "attack_protection_suspicious_ip_allowlist_present",
        "Suspicious IP Throttling",
        `suspicious_ip_throttling.allowlist: Allowlist is configured with entries: ${item.value}.`
      )
    );
  }

  return findings;
}
