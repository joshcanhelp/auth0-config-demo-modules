import type { Management } from "auth0";

import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { findingsForField, loadCheck } from "./shared.js";

const checkRefreshToken = loadCheck("checkRefreshToken.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  clients_use_rotating_refresh_token: {
    level: "important",
    description:
      "Refresh token rotation is not enabled. Rotating refresh tokens should be used.",
    property: "refresh_token.rotation_type",
  },
};

export async function checkUseRotatingRefreshToken(
  clients: Management.Client[]
): Promise<Finding[]> {
  const result = await checkRefreshToken({ clients });
  return findingsForField(
    result,
    "use_rotating_refresh_token",
    DEFINITIONS,
    "clients_use_rotating_refresh_token",
    (_report, value) =>
      `refresh_token.rotation_type: Refresh token rotation is "${value}". Rotating refresh tokens should be used.`
  );
}
