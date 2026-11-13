import type { Management } from "auth0";

import type { RequestDescriptor } from "../api-client.js";
import { requireScopes } from "../requireScopes.js";

export type GetClientParams = Management.GetClientRequestParameters;
export type Client = Management.Client;

// https://auth0.com/docs/api/management/v2/clients/get-clients-by-id
export function buildGetClientRequest(
  id: string,
  params?: GetClientParams,
  scopes?: string[]
): RequestDescriptor {
  requireScopes(["read:clients"], scopes);
  return {
    method: "GET",
    path: `/clients/${encodeURIComponent(id)}`,
    query: params,
  };
}
