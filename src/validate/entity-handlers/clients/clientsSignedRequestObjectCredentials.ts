import type { Management } from "auth0";

import type { Finding, ValidationDefinition } from "../../types.js";
import { findingsForField, loadCheck } from "./shared.js";

// checkJAR reports two distinct fields - this one, and "signed_request_object.required" (see
// clientsSignedRequestObjectRequired.ts). Calling it once per field costs a little duplicate
// work, traded for each validation code having its own self-contained file.
const checkJAR = loadCheck("checkJAR.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  "clients_signed_request_object.credentials": {
    level: "important",
    description: "JAR is required but no signing credentials are configured.",
    property: "signed_request_object.credentials",
  },
};

export async function checkSignedRequestObjectCredentials(
  clients: Management.Client[]
): Promise<Finding[]> {
  const result = await checkJAR({ clients });
  return findingsForField(
    result,
    "signed_request_object.credentials",
    DEFINITIONS,
    "clients_signed_request_object.credentials",
    () =>
      "signed_request_object.credentials: JAR is required but no signing credentials are configured."
  );
}
