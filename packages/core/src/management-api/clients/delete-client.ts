import type { RequestDescriptor } from "../api-client.js";
import { requireScopes } from "../requireScopes.js";

// https://auth0.com/docs/api/management/v2/clients/delete-clients-by-id
//
// No other guardrails here - deploy-cli's delete guard (AUTH0_ALLOW_DELETE) is a config-driven
// decision across the whole set of changes being pushed, not a rule about the shape of this one
// call, so it belongs one layer up in the code that decides what to delete.
export function buildDeleteClientRequest(
  id: string,
  scopes?: string[]
): RequestDescriptor {
  requireScopes(["delete:clients"], scopes);
  return {
    method: "DELETE",
    path: `/clients/${encodeURIComponent(id)}`,
  };
}
