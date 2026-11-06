import type { Management } from "auth0";

import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";

// cross_origin_auth and oidc_backchannel_logout were both renamed in the Auth0 Management API
// (to cross_origin_authentication and oidc_logout, respectively), but Auth0 still accepts the old
// names - so stale config keeps working with no signal that it's out of date. Flags local config
// still using either old name; src/auth0/management-api/clients doesn't rewrite these for you,
// since that's a judgment call on the user's data, not a mechanical field strip.
export const DEFINITIONS: Record<string, ValidationDefinition> = {
  clients_deprecated_cross_origin_auth: {
    level: "recommended",
    description:
      'Deprecated field "cross_origin_auth" is set; use "cross_origin_authentication".',
    property: "cross_origin_auth",
  },
  clients_deprecated_oidc_backchannel_logout: {
    level: "recommended",
    description: 'Deprecated field "oidc_backchannel_logout" is set; use "oidc_logout".',
    property: "oidc_backchannel_logout",
  },
};

export function checkDeprecatedFieldNames(clients: Management.Client[]): Finding[] {
  const findings: Finding[] = [];

  for (const client of clients) {
    if (client.global) continue;

    // cross_origin_auth was fully removed from the Management API's own types, so it only shows
    // up here as an untyped leftover from an older export - hence the loose cast.
    const loose = client as unknown as Record<string, unknown>;
    const name = client.name ?? "Unknown Client";

    if ("cross_origin_auth" in loose) {
      findings.push(
        buildFinding(
          DEFINITIONS,
          "clients_deprecated_cross_origin_auth",
          name,
          'cross_origin_auth: Deprecated - rename to "cross_origin_authentication".',
          { entityId: client.client_id }
        )
      );
    }

    if ("oidc_backchannel_logout" in loose) {
      findings.push(
        buildFinding(
          DEFINITIONS,
          "clients_deprecated_oidc_backchannel_logout",
          name,
          'oidc_backchannel_logout: Deprecated - rename to "oidc_logout".',
          { entityId: client.client_id }
        )
      );
    }
  }

  return findings;
}
