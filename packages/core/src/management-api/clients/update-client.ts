import type { Management } from "auth0";
import chalk from "chalk";

import type { RequestDescriptor } from "../api-client.js";
import { stripFields } from "../stripFields.js";
import { stripSecretEncoded, stripTokenVaultPrivilegedAccess } from "./sanitize.js";

export type UpdateClientParams = Omit<
  Management.UpdateClientRequestContent,
  "client_secret"
> & {
  // Signals a CIMD client so the payload gets restricted to its editable field set below -
  // never sent to Auth0 itself, since PATCH /clients/:id doesn't accept this field.
  external_client_id?: string;
};
export type Client = Management.Client;

const STRIPPED_UPDATE_FIELDS = [
  "callback_url_template",
  "signing_keys",
  "global",
  "tenant",
  "resource_server_identifier",
  "external_metadata_type",
  "external_metadata_created_by",
  "jwks_uri",
  "created_at",
  "updated_at",
  "third_party_security_mode", // immutable after creation - PATCH returns 400
] as const;

// Once a CIMD (Client ID Metadata Document) client exists, only this field set can be changed
// through update-client - everything else about it is owned by the external Client ID Metadata
// Document. Mirrored in src/validate/entity-handlers/clients/clientsCimdFieldsNotEditable.ts,
// which flags local config setting anything outside this set before a deploy gets here - keep
// both lists in sync.
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

function restrictToCimdEditableFields(
  body: Record<string, unknown>,
  externalClientId: string
): Record<string, unknown> {
  const kept: Record<string, unknown> = {};
  const dropped: string[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (CIMD_EDITABLE_FIELDS.has(key)) {
      kept[key] = value;
    } else {
      dropped.push(key);
    }
  }

  console.log(
    chalk.gray(
      `[clients] restricting update-client to CIMD-editable fields for external_client_id="${externalClientId}"${
        dropped.length > 0 ? ` - dropping [${dropped.join(", ")}]` : ""
      }`
    )
  );

  return kept;
}

// https://auth0.com/docs/api/management/v2/clients/patch-clients-by-id
//
// Guardrails ported from auth0-deploy-cli's ClientHandler (updateClient/processChanges):
// - client_secret is rejected - use the dedicated rotate-secret endpoint instead.
// - A CIMD client (external_client_id set) only allows updating a narrow field set.
// - Fields the API rejects outright and token_vault_privileged_access are stripped before the
//   request is built. Deprecated field names and CIMD-editable-field limits are flagged by
//   src/validate/entity-handlers/clients/ before a deploy ever gets here, not fixed up silently.
export function buildUpdateClientRequest(
  id: string,
  params: UpdateClientParams
): RequestDescriptor {
  if ("client_secret" in params) {
    throw new Error(
      "client_secret cannot be set through update-client - rotate it through the dedicated rotate-secret endpoint instead."
    );
  }

  const { external_client_id, ...rest } = params as Record<string, unknown> & {
    external_client_id?: string;
  };

  let body = external_client_id
    ? restrictToCimdEditableFields(rest, external_client_id)
    : rest;

  body = stripFields(body, STRIPPED_UPDATE_FIELDS, "update-client");
  body = stripSecretEncoded(body, "update-client");
  body = stripTokenVaultPrivilegedAccess(body, "update-client");

  return {
    method: "PATCH",
    path: `/clients/${encodeURIComponent(id)}`,
    body,
  };
}
