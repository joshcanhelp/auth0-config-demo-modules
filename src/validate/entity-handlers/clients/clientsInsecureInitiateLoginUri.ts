import type { Management } from "auth0";

import type { Finding, ValidationDefinition } from "../../types.js";
import { findingsForField, loadCheck, type TenantTag } from "./shared.js";

// checkApplicationLoginUri reports two distinct fields - this one, and
// "missing_initiate_login_uri" (see clientsMissingInitiateLoginUri.ts). Calling it once per
// field costs a little duplicate work, traded for each validation code having its own
// self-contained file.
const checkApplicationLoginUri = loadCheck("checkApplicationLoginUri.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  clients_insecure_initiate_login_uri: {
    level: "important",
    description: "Insecure pattern in initiate_login_uri.",
    property: "initiate_login_uri",
  },
};

// Not checked for dev tenants - insecure-looking initiate_login_uri patterns are expected
// there.
export async function checkInsecureInitiateLoginUri(
  clients: Management.Client[],
  tenantTag: TenantTag
): Promise<Finding[]> {
  if (tenantTag === "dev") return [];

  const result = await checkApplicationLoginUri({ clients });
  return findingsForField(
    result,
    "insecure_initiate_login_uri",
    DEFINITIONS,
    "clients_insecure_initiate_login_uri",
    (_report, value) => `initiate_login_uri: Insecure pattern in initiate_login_uri: ${value}`
  );
}
