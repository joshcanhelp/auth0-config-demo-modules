import type { Management } from "auth0";

import type { Finding, ValidationDefinition } from "../../types.js";
import { findingsForField, loadCheck, type TenantTag } from "./shared.js";

const checkAllowedCallbacks = loadCheck("checkAllowedCallbacks.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  clients_insecure_callbacks: {
    level: "important",
    description: "Insecure pattern in a callback URL.",
    property: "callbacks",
  },
};

// Not checked for dev tenants - insecure-looking callback patterns (e.g. http://localhost)
// are expected there.
export async function checkInsecureCallbacks(
  clients: Management.Client[],
  tenantTag: TenantTag
): Promise<Finding[]> {
  if (tenantTag === "dev") return [];

  const result = await checkAllowedCallbacks({ clients });
  return findingsForField(
    result,
    "insecure_callbacks",
    DEFINITIONS,
    "clients_insecure_callbacks",
    (_report, value) => `callbacks: Insecure pattern in callback URL: ${value}`
  );
}
