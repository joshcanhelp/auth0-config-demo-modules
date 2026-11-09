import type { Management } from "auth0";

import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";

// token_vault_privileged_access is always stripped before create/update (see
// packages/core/src/management-api/clients/sanitize.ts) because Auth0 requires tenant-specific credential
// ids that this app never persists - there's no local config fix that makes it deployable, so
// this just surfaces the limitation before a push instead of leaving it to deploy-log output.
export const DEFINITIONS: Record<string, ValidationDefinition> = {
  clients_token_vault_privileged_access_not_deployable: {
    level: "informational",
    description:
      "token_vault_privileged_access is set locally but is stripped automatically on deploy - manage it directly on the tenant.",
    property: "token_vault_privileged_access",
  },
};

export function checkTokenVaultPrivilegedAccessNotDeployable(
  clients: Management.Client[]
): Finding[] {
  const findings: Finding[] = [];

  for (const client of clients) {
    if (client.global || !client.token_vault_privileged_access) continue;

    findings.push(
      buildFinding(
        DEFINITIONS,
        "clients_token_vault_privileged_access_not_deployable",
        client.name ?? "Unknown Client",
        "token_vault_privileged_access: Stripped automatically on deploy - manage directly on the tenant.",
        { entityId: client.client_id }
      )
    );
  }

  return findings;
}
