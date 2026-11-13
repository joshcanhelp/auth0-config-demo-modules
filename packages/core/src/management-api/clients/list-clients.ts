import type { Management } from "auth0";

import type { RequestDescriptor } from "../api-client.js";
import { requireScopes } from "../requireScopes.js";

export type ListClientsParams = Management.ListClientsRequestParameters;
export type ListClientsPaginatedResponse =
  Management.ListClientsOffsetPaginatedResponseContent;
export type Client = Management.Client;

// https://auth0.com/docs/api/management/v2/clients/get-clients
//
// Resolves to a plain array by default, or the { clients, start, limit, total } envelope when
// include_totals is true - matching the API's own behavior.
export function buildListClientsRequest(
  params?: ListClientsParams,
  scopes?: string[]
): RequestDescriptor {
  requireScopes(["read:clients"], scopes);
  return {
    method: "GET",
    path: "/clients",
    query: params,
  };
}
