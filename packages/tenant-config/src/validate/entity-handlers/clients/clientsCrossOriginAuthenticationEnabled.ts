import type { Management } from "auth0";

import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { findingsForField, loadCheck } from "./shared.js";

const checkCrossOriginAuthentication = loadCheck("checkCrossOriginAuthentication.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  clients_cross_origin_authentication_enabled: {
    level: "important",
    description:
      "Cross-origin authentication is enabled. This feature has been deprecated by Auth0.",
    property: "cross_origin_authentication",
  },
};

export async function checkCrossOriginAuthenticationEnabled(
  clients: Management.Client[]
): Promise<Finding[]> {
  const result = await checkCrossOriginAuthentication({ clients });
  return findingsForField(
    result,
    "cross_origin_authentication_enabled",
    DEFINITIONS,
    "clients_cross_origin_authentication_enabled",
    () =>
      "cross_origin_authentication: Cross-origin authentication is enabled. This feature has been deprecated by Auth0."
  );
}
