import type { Auth0Client } from "../types.js";

export function findClient(clients: Auth0Client[], clientId: string): Auth0Client {
  const client = clients.find((c) => c.client_id === clientId);
  if (!client) throw new Error(`Client not found: ${clientId}`);
  return client;
}

export function findLoginableClient(
  clients: Auth0Client[],
  clientId: string
): Auth0Client {
  const client = clients.find((c) => c.client_id === clientId);

  if (!client) {
    throw new Error(`Client not found: ${clientId}`);
  }

  if (client.app_type === "non_interactive") {
    throw new Error(`Client "${client.name}" does not support login`);
  }

  return client;
}
