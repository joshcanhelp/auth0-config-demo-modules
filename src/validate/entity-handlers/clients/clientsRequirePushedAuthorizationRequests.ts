import type { Management } from "auth0";

import type { Finding, ValidationDefinition } from "../../types.js";
import { findingsForField, loadCheck } from "./shared.js";

const checkPAR = loadCheck("checkPAR.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  clients_require_pushed_authorization_requests: {
    level: "recommended",
    description:
      "Pushed Authorization Requests (PAR) are not required for this confidential client.",
    property: "require_pushed_authorization_requests",
  },
};

export async function checkRequirePushedAuthorizationRequests(
  clients: Management.Client[]
): Promise<Finding[]> {
  const result = await checkPAR({ clients });
  return findingsForField(
    result,
    "require_pushed_authorization_requests",
    DEFINITIONS,
    "clients_require_pushed_authorization_requests",
    () =>
      "require_pushed_authorization_requests: Pushed Authorization Requests (PAR) are not required for this confidential client."
  );
}
