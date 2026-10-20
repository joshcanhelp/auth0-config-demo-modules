// Composition root: assembles the bare request-executing client from client.ts with each
// entity's namespace. This is the only file that needs to know about every entity - client.ts
// stays generic, and each entity directory stays unaware of any entity but itself.

import { createManagementApiClient as createCoreClient } from "./client.js";
import type { ManagementApiClient, ManagementApiClientOptions } from "./client.js";
import { createClientsNamespace } from "./clients/index.js";

export type { RequestDescriptor, ManagementApiClient, ManagementApiClientOptions } from "./client.js";

export function createManagementApiClient(options: ManagementApiClientOptions) {
  const core: ManagementApiClient = createCoreClient(options);

  return {
    ...core,
    clients: createClientsNamespace(core),
  };
}
