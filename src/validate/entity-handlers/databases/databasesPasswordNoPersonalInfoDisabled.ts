import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadFlatCheck } from "./shared.js";

const checkPasswordNoPersonalInfo = loadFlatCheck("checkPasswordNoPersonalInfo.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  databases_password_no_personal_info_disabled: {
    level: "recommended",
    description: "Personal info check for passwords is disabled.",
    property: "options.password_no_personal_info",
  },
};

export async function checkDatabasesPasswordNoPersonalInfoDisabled(
  databases: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkPasswordNoPersonalInfo({ databases });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "password_no_personal_info_disabled") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "databases_password_no_personal_info_disabled",
        item.name ?? "Unknown Connection",
        "options.password_no_personal_info: Personal info check for passwords is disabled."
      )
    );
  }

  return findings;
}
