import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadFlatCheck } from "./shared.js";

// checkEmailAttributeVerification reports two distinct fields - this one, and
// "flexible_identifiers_disabled" (see databasesFlexibleIdentifiersDisabled.ts). Calling it
// once per field costs a little duplicate work, traded for each validation code having its
// own self-contained file.
const checkEmailAttributeVerification = loadFlatCheck("checkEmailAttributeVerification.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  databases_verification_by_link_method: {
    level: "recommended",
    description:
      "Email verification uses link method. Consider OTP for a better user experience.",
    property: "attributes.email.verification_method",
  },
};

export async function checkDatabasesVerificationByLinkMethod(
  databases: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkEmailAttributeVerification({ databases });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "verification_by_link_method") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "databases_verification_by_link_method",
        item.name ?? "Unknown Connection",
        "attributes.email.verification_method: Email verification uses link method. Consider OTP for a better user experience."
      )
    );
  }

  return findings;
}
