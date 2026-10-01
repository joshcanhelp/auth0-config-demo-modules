import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadFlatCheck } from "./shared.js";

// checkEmailAttributeVerification reports two distinct fields - this one, and
// "verification_by_link_method" (see databasesVerificationByLinkMethod.ts). Calling it once
// per field costs a little duplicate work, traded for each validation code having its own
// self-contained file.
const checkEmailAttributeVerification = loadFlatCheck("checkEmailAttributeVerification.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  databases_flexible_identifiers_disabled: {
    level: "informational",
    description: "Flexible identifiers are not configured for this connection.",
    property: "attributes",
  },
};

export async function checkDatabasesFlexibleIdentifiersDisabled(
  databases: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkEmailAttributeVerification({ databases });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "flexible_identifiers_disabled") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "databases_flexible_identifiers_disabled",
        item.name ?? "Unknown Connection",
        "attributes: Flexible identifiers are not configured for this connection."
      )
    );
  }

  return findings;
}
