import type { Auth0Client, LoginMethod } from "../types.js";

export function detectLoginMethod(
  client: Auth0Client,
  env: NodeJS.ProcessEnv
): LoginMethod {
  const secretKey = `CLIENT_ID_${client.client_id}_SECRET`;
  const hasSecret = Boolean(env[secretKey]);
  const requiresSecret = client.token_endpoint_auth_method !== "none";

  if (requiresSecret && hasSecret) {
    return "backend";
  }

  return "frontend";
}
