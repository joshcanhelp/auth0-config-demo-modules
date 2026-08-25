import type { Auth0Client } from "../types.js";

export function buildLogoutUrl({
  loginDomain,
  client,
  returnTo,
}: {
  loginDomain: string;
  client?: Auth0Client;
  returnTo?: string;
}): string {
  const params = new URLSearchParams({
    ...(client ? { client_id: client.client_id } : {}),
    ...(returnTo ? { returnTo } : {}),
  });
  return `https://${loginDomain}/v2/logout?${params.toString()}`;
}
