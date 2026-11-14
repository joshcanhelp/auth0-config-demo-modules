import type { Management } from "auth0";

import type { RequestDescriptor } from "../api-client.js";
import { debugLog } from "../../logger.js";
import { requireScopes } from "../requireScopes.js";
import { stripFields } from "../stripFields.js";
import { stripSecretEncoded, stripTokenVaultPrivilegedAccess } from "./sanitize.js";

export type CreateClientParams = Omit<
  Management.CreateClientRequestContent,
  "client_secret"
>;
export type RegisterCimdClientParams = Management.RegisterCimdClientRequestContent;
export type Client = Management.Client;

const STRIPPED_CREATE_FIELDS = [
  "external_metadata_type",
  "external_metadata_created_by",
  "jwks_uri",
  "created_at",
  "updated_at",
  "encrypted",
  "client_id",
] as const;

// https://auth0.com/docs/api/management/v2/clients/post-clients
// https://auth0.com/docs/api/management/v2/clients/post-cimd-register
//
// Guardrails ported from auth0-deploy-cli's ClientHandler (createClient/processChanges):
// - client_secret is rejected - use the dedicated rotate-secret endpoint instead.
// - A CIMD (Client ID Metadata Document) client - identified by external_client_id - is
//   registered through its own endpoint rather than the standard create call.
// - Fields the API sets itself and token_vault_privileged_access are stripped before the request
//   is built. Deprecated field names and CIMD-editable-field limits are flagged by
//   src/validate/entity-handlers/clients/ before a deploy ever gets here, not fixed up silently.
export function buildCreateClientRequest(
  params: CreateClientParams | RegisterCimdClientParams,
  scopes?: string[]
): RequestDescriptor {
  requireScopes(["create:clients"], scopes);

  if ("client_secret" in params) {
    throw new Error(
      "client_secret cannot be set through create-client - rotate it through the dedicated rotate-secret endpoint instead."
    );
  }

  if ("external_client_id" in params) {
    debugLog(
      `[clients] routing create-client to CIMD registration for external_client_id="${params.external_client_id}"`
    );
    return {
      method: "POST",
      path: "/clients/cimd/register",
      body: params,
    };
  }

  let body = params as Record<string, unknown>;
  body = stripFields(body, STRIPPED_CREATE_FIELDS, "create-client");
  body = stripSecretEncoded(body, "create-client");
  body = stripTokenVaultPrivilegedAccess(body, "create-client");

  return {
    method: "POST",
    path: "/clients",
    body,
  };
}
