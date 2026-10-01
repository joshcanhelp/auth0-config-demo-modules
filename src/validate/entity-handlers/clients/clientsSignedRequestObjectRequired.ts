import type { Management } from "auth0";

import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { findingsForField, loadCheck } from "./shared.js";

// checkJAR reports two distinct fields - this one, and "signed_request_object.credentials"
// (see clientsSignedRequestObjectCredentials.ts). Calling it once per field costs a little
// duplicate work, traded for each validation code having its own self-contained file.
const checkJAR = loadCheck("checkJAR.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  "clients_signed_request_object.required": {
    level: "recommended",
    description:
      "JWT Authorization Requests (JAR) are not required for this confidential client.",
    property: "signed_request_object.required",
  },
};

export async function checkSignedRequestObjectRequired(
  clients: Management.Client[]
): Promise<Finding[]> {
  const result = await checkJAR({ clients });
  return findingsForField(
    result,
    "signed_request_object.required",
    DEFINITIONS,
    "clients_signed_request_object.required",
    () =>
      "signed_request_object.required: JWT Authorization Requests (JAR) are not required for this confidential client."
  );
}
