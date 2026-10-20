import type { Management } from "auth0";

import type { RequestDescriptor } from "../client.js";

export type GetClientParams = Management.GetClientRequestParameters;
export type Client = Management.Client;

// https://auth0.com/docs/api/management/v2/clients/get-clients-by-id
export function buildGetClientRequest(id: string, params?: GetClientParams): RequestDescriptor {
  return {
    method: "GET",
    path: `/clients/${encodeURIComponent(id)}`,
    query: params,
  };
}
