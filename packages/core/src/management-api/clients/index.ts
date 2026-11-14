import type { Management } from "auth0";

import type { ManagementApiClient } from "../api-client.js";
import { paginateAll } from "../pagination.js";
import { stripFields } from "../stripFields.js";
import { buildGetClientRequest } from "./get-client.js";
import type { GetClientParams } from "./get-client.js";
import { buildListClientsRequest } from "./list-clients.js";
import type { ListClientsParams } from "./list-clients.js";
import { buildCreateClientRequest } from "./create-client.js";
import type { CreateClientParams, RegisterCimdClientParams } from "./create-client.js";
import { buildUpdateClientRequest } from "./update-client.js";
import type { UpdateClientParams } from "./update-client.js";
import { buildDeleteClientRequest } from "./delete-client.js";
import {
  CLIENT_EXPORT_EXCLUDED_FIELDS,
  promoteDeprecatedCrossOriginAuth,
} from "./exportFields.js";

export { buildGetClientRequest } from "./get-client.js";
export type { GetClientParams } from "./get-client.js";
export { buildListClientsRequest } from "./list-clients.js";
export type { ListClientsParams, ListClientsPaginatedResponse } from "./list-clients.js";
export { buildCreateClientRequest } from "./create-client.js";
export type { CreateClientParams, RegisterCimdClientParams } from "./create-client.js";
export { buildUpdateClientRequest } from "./update-client.js";
export type { UpdateClientParams } from "./update-client.js";
export { buildDeleteClientRequest } from "./delete-client.js";

export type Client = Management.Client;

// Clients are a standard collection resource, identified by client_id - not a tenant-wide
// singleton like branding or attackProtection, which only ever have a get/update pair.
export const identifierField = "client_id";
export const isSingleton = false;

// list() always fetches every client, so pagination-control params aren't meaningful caller
// inputs - page is managed internally by paginateAll, and include_totals never gets set since
// paginateAll expects a plain array per page, not the { clients, start, limit, total } envelope.
export type ListAllClientsParams = Omit<ListClientsParams, "page" | "include_totals">;

// Strips fields that never belong in a local config file (live secrets, deprecated/read-only
// aliases) from a client the API just returned - see exportFields.ts for why each one's there.
// Applied on every get/list/create/update response - a create in particular returns the full
// new client, live secret and signing keys included, same as get/list do - so nothing downstream
// (e.g. a push/import command writing a response straight to disk) has to know to do it itself.
// Generic rather than pinned to Client so create's CIMD registration response (a different shape)
// goes through the same strip without a cast.
function stripExportFields<T extends Record<string, unknown>>(client: T): T {
  const promoted = promoteDeprecatedCrossOriginAuth(client);
  return stripFields(
    promoted,
    CLIENT_EXPORT_EXCLUDED_FIELDS,
    "clients",
    "doesn't belong in local config"
  ) as T;
}

// Every method below takes a trailing, optional `scopes` - the calling token's own granted
// scopes. Pass it to have the matching builder fail fast, client-side, when it's missing what
// this specific operation needs; omit it (the default) to skip the check entirely, e.g. when the
// caller doesn't track scopes at all. See ../requireScopes.ts and ./scopes.ts.
export function createClientsNamespace(client: ManagementApiClient) {
  return {
    get: async (id: string, params?: GetClientParams, scopes?: string[]) =>
      stripExportFields(
        await client.request<Client>(buildGetClientRequest(id, params, scopes))
      ),
    // Excludes the tenant's own global/implicit client by default (named "All Applications" in
    // the dashboard unless renamed) - it's not a normal application a demo would deploy or push
    // changes to, and ported from auth0-deploy-cli's own getType(), which always passed
    // is_global: false. An explicit is_global in params overrides this.
    list: async (params?: ListAllClientsParams, scopes?: string[]): Promise<Client[]> => {
      const clients = await paginateAll<Client>(
        (pageParams) =>
          client.request<Client[]>(
            buildListClientsRequest(
              { is_global: false, ...params, ...pageParams },
              scopes
            )
          ),
        { perPage: params?.per_page ?? undefined }
      );
      return clients.map(stripExportFields);
    },
    // async here (not just a direct passthrough) even though there's no await before the call -
    // a builder's requireScopes check throws synchronously, and wrapping it in an async function
    // turns that into a proper promise rejection, consistent with get/list and safe for a
    // .catch()-style caller instead of only a try/await one.
    create: async (
      params: CreateClientParams | RegisterCimdClientParams,
      scopes?: string[]
    ) =>
      stripExportFields(
        await client.request<Client | Management.RegisterCimdClientResponseContent>(
          buildCreateClientRequest(params, scopes)
        )
      ),
    update: async (id: string, params: UpdateClientParams, scopes?: string[]) =>
      stripExportFields(
        await client.request<Client>(buildUpdateClientRequest(id, params, scopes))
      ),
    delete: async (id: string, scopes?: string[]) =>
      client.request<void>(buildDeleteClientRequest(id, scopes)),
  };
}
