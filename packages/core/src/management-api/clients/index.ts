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
// Applied on every get/list so nothing downstream (e.g. a pull command writing this straight to
// disk) has to know to do it itself. Quiet - stripping a secret on every single pull would just be
// noise, unlike a write-path strip a human might need to notice.
function stripExportFields(client: Client): Client {
  const promoted = promoteDeprecatedCrossOriginAuth(client as Record<string, unknown>);
  return stripFields(promoted, CLIENT_EXPORT_EXCLUDED_FIELDS, "clients", {
    quiet: true,
  }) as Client;
}

export function createClientsNamespace(client: ManagementApiClient) {
  return {
    get: async (id: string, params?: GetClientParams) =>
      stripExportFields(await client.request<Client>(buildGetClientRequest(id, params))),
    // Excludes the tenant's own global/implicit client by default (named "All Applications" in
    // the dashboard unless renamed) - it's not a normal application a demo would deploy or push
    // changes to, and ported from auth0-deploy-cli's own getType(), which always passed
    // is_global: false. An explicit is_global in params overrides this.
    list: async (params?: ListAllClientsParams): Promise<Client[]> => {
      const clients = await paginateAll<Client>(
        (pageParams) =>
          client.request<Client[]>(
            buildListClientsRequest({ is_global: false, ...params, ...pageParams })
          ),
        { perPage: params?.per_page ?? undefined }
      );
      return clients.map(stripExportFields);
    },
    create: (params: CreateClientParams | RegisterCimdClientParams) =>
      client.request<Client | Management.RegisterCimdClientResponseContent>(
        buildCreateClientRequest(params)
      ),
    update: (id: string, params: UpdateClientParams) =>
      client.request<Client>(buildUpdateClientRequest(id, params)),
    delete: (id: string) => client.request<void>(buildDeleteClientRequest(id)),
  };
}
