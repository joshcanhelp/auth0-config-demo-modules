import type { Management } from "auth0";

import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { findingsForField, loadCheck } from "./shared.js";

const checkJWTSignAlg = loadCheck("checkJWTSignAlg.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  clients_not_using_asymmetric_alg: {
    level: "important",
    description:
      "ID tokens are signed with HS256, a symmetric algorithm. Use RS256 or another asymmetric algorithm.",
    property: "jwt_configuration.alg",
  },
};

export async function checkNotUsingAsymmetricAlg(
  clients: Management.Client[]
): Promise<Finding[]> {
  const result = await checkJWTSignAlg({ clients });
  return findingsForField(
    result,
    "not_using_asymmetric_alg",
    DEFINITIONS,
    "clients_not_using_asymmetric_alg",
    () =>
      "jwt_configuration.alg: ID tokens are signed with HS256, a symmetric algorithm. Use RS256 or another asymmetric algorithm."
  );
}
