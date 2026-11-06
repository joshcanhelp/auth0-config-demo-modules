import type { Management } from "auth0";

import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";

// Mirrors the editable-field allowlist in
// src/auth0/management-api/clients/update-client.ts - keep both in sync. Once a CIMD (Client ID
// Metadata Document) client exists (external_client_id is set), update-client.ts restricts the
// write to this field set, so anything else set in local config for one of these clients is
// silently ignored on deploy.
const CIMD_EDITABLE_FIELDS = new Set<string>([
  "description",
  "app_type",
  "allowed_origins",
  "web_origins",
  "grant_types",
  "oidc_conformant",
  "organization_discovery_methods",
  "client_metadata",
  "default_organization",
  "require_proof_of_possession",
  "token_quota",
  "skip_non_verifiable_callback_uri_confirmation_prompt",
  "jwt_configuration",
  "refresh_token",
]);

// Identity/read-only fields that are already covered by the general "server-set field" strip
// applied to every client write - not worth flagging again as CIMD-specific.
const IGNORED_FIELDS = new Set<string>([
  "client_id",
  "external_client_id",
  "client_secret",
  "created_at",
  "updated_at",
  "jwks_uri",
  "signing_keys",
  "global",
  "tenant",
  "callback_url_template",
  "resource_server_identifier",
  "external_metadata_type",
  "external_metadata_created_by",
  "third_party_security_mode",
]);

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  clients_cimd_fields_not_editable: {
    level: "important",
    description:
      "Fields are set on a CIMD client that update-client.ts cannot change - they'll be silently ignored on deploy.",
    property: "external_client_id",
  },
};

function isNotEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function checkCimdFieldsNotEditable(clients: Management.Client[]): Finding[] {
  const findings: Finding[] = [];

  for (const client of clients) {
    if (client.global || !client.external_client_id) continue;

    const offendingFields = Object.keys(client).filter(
      (key) =>
        !CIMD_EDITABLE_FIELDS.has(key) &&
        !IGNORED_FIELDS.has(key) &&
        isNotEmpty((client as Record<string, unknown>)[key])
    );
    if (offendingFields.length === 0) continue;

    findings.push(
      buildFinding(
        DEFINITIONS,
        "clients_cimd_fields_not_editable",
        client.name ?? "Unknown Client",
        `${offendingFields.join(", ")}: These fields are ignored on deploy for a CIMD client.`,
        { entityId: client.client_id, value: offendingFields.join(", ") }
      )
    );
  }

  return findings;
}
