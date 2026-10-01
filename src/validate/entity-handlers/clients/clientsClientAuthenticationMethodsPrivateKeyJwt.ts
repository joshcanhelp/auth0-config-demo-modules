import type { Management } from "auth0";
import assert from "node:assert";

import { buildFinding } from "../../finding.js";
import type { Finding, ValidationDefinition } from "../../types.js";
import { clientDisplayName, loadCheck } from "./shared.js";

const checkPrivateKeyJWT = loadCheck("checkPrivateKeyJWT.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  "clients_client_authentication_methods.private_key_jwt": {
    level: "recommended",
    description:
      "Private key JWT client authentication is not configured. Consider it over shared client secrets.",
    property: "client_authentication_methods.private_key_jwt",
  },
};

// Excluded: the demo's own connector apps, which authenticate via a fixed client secret by
// design rather than private key JWT.
const EXCLUDED_CLIENT_NAMES = ["Actions Connector", "Forms Connector"];

export async function checkClientAuthenticationMethodsPrivateKeyJwt(
  clients: Management.Client[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkPrivateKeyJWT({ clients });

  for (const clientReport of result.details) {
    for (const report of clientReport.report) {
      if (
        report.status !== "red" ||
        report.field !== "client_authentication_methods.private_key_jwt"
      ) {
        continue;
      }

      const client = clients.find((c) => c.client_id === report.client_id);
      assert(client, "Client not found");
      if (EXCLUDED_CLIENT_NAMES.includes(client.name!)) continue;

      const value = report.value !== undefined ? String(report.value) : undefined;
      findings.push(
        buildFinding(
          DEFINITIONS,
          "clients_client_authentication_methods.private_key_jwt",
          clientDisplayName(report),
          "client_authentication_methods.private_key_jwt: Private key JWT client authentication is not configured. Consider it over shared client secrets.",
          { entityId: report.client_id, value }
        )
      );
    }
  }

  return findings;
}
