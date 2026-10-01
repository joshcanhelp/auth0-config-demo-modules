import type { Management } from "auth0";

import type { Finding, ValidationDefinition } from "../../types.js";
import { findingsForField, loadCheck } from "./shared.js";

// checkApplicationLoginUri reports two distinct fields - this one, and
// "insecure_initiate_login_uri" (see clientsInsecureInitiateLoginUri.ts). Calling it once per
// field costs a little duplicate work, traded for each validation code having its own
// self-contained file.
const checkApplicationLoginUri = loadCheck("checkApplicationLoginUri.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  clients_missing_initiate_login_uri: {
    level: "recommended",
    description:
      "No initiate_login_uri configured. Third-party initiated login will not work.",
    property: "initiate_login_uri",
  },
};

export async function checkMissingInitiateLoginUri(
  clients: Management.Client[]
): Promise<Finding[]> {
  const result = await checkApplicationLoginUri({ clients });
  return findingsForField(
    result,
    "missing_initiate_login_uri",
    DEFINITIONS,
    "clients_missing_initiate_login_uri",
    () => "initiate_login_uri: No initiate_login_uri configured. Third-party initiated login will not work."
  );
}
