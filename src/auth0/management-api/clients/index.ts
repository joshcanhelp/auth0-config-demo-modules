import type { Management } from "auth0";

import type { ManagementApiClient } from "../client.js";
import { paginateAll } from "../pagination.js";
import { buildGetClientRequest } from "./get-client.js";
import type { GetClientParams } from "./get-client.js";
import { buildListClientsRequest } from "./list-clients.js";
import type { ListClientsParams } from "./list-clients.js";

export { buildGetClientRequest } from "./get-client.js";
export type { GetClientParams } from "./get-client.js";
export { buildListClientsRequest } from "./list-clients.js";
export type { ListClientsParams, ListClientsPaginatedResponse } from "./list-clients.js";

export type Client = Management.Client;

// Clients are a standard collection resource, identified by client_id - not a tenant-wide
// singleton like branding or attackProtection, which only ever have a get/update pair.
export const identifierField = "client_id";
export const isSingleton = false;

// list() always fetches every client, so pagination-control params aren't meaningful caller
// inputs - page is managed internally by paginateAll, and include_totals never gets set since
// paginateAll expects a plain array per page, not the { clients, start, limit, total } envelope.
export type ListAllClientsParams = Omit<ListClientsParams, "page" | "include_totals">;

export function createClientsNamespace(client: ManagementApiClient) {
  return {
    get: (id: string, params?: GetClientParams) =>
      client.request<Client>(buildGetClientRequest(id, params)),
    list: (params?: ListAllClientsParams): Promise<Client[]> =>
      paginateAll<Client>(
        (pageParams) =>
          client.request<Client[]>(buildListClientsRequest({ ...params, ...pageParams })),
        { perPage: params?.per_page ?? undefined }
      ),
  };
}
