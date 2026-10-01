import type { Management } from "auth0";

import type { Finding, ValidationDefinition } from "../../types.js";
import { findingsForField, loadCheck } from "./shared.js";

const checkGrantTypes = loadCheck("checkGrantTypes.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  clients_unexpected_grant_type_for_app_type: {
    level: "important",
    description: "Unexpected grant types for the application type.",
    property: "grant_types",
  },
};

export async function checkUnexpectedGrantTypeForAppType(
  clients: Management.Client[]
): Promise<Finding[]> {
  const result = await checkGrantTypes({ clients });
  return findingsForField(
    result,
    "unexpected_grant_type_for_app_type",
    DEFINITIONS,
    "clients_unexpected_grant_type_for_app_type",
    (report, value) =>
      `grant_types: Unexpected grant types for ${report.app_type ?? "unknown"} application: ${value}`
  );
}
