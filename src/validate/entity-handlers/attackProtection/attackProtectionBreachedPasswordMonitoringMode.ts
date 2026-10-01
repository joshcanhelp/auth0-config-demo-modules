import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import type { AttackProtectionConfig } from "./shared.js";
import { loadCheck } from "./shared.js";

const checkBreachedPassword = loadCheck("checkBreachedPassword.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  attack_protection_breached_password_monitoring_mode: {
    level: "important",
    description:
      "Detection is enabled but no shields are configured (monitoring mode only).",
    property: "breached_password_detection",
  },
};

export async function checkAttackProtectionBreachedPasswordMonitoringMode(
  config: AttackProtectionConfig
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkBreachedPassword({
    attackProtection: { breachedPasswordDetection: config.breachedPasswordDetection },
  });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "monitoring_mode") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "attack_protection_breached_password_monitoring_mode",
        "Breached Password Detection",
        "breached_password_detection: Detection is enabled but no shields are configured (monitoring mode only)."
      )
    );
  }

  return findings;
}
