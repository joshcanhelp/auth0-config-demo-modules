// Composition root: assembles the bare request-executing client from client.ts with each
// entity's namespace. This is the only file that needs to know about every entity - client.ts
// stays generic, and each entity directory stays unaware of any entity but itself.

import { createManagementApiClient as createCoreClient } from "./api-client.js";
import type { ManagementApiClient, ManagementApiClientOptions } from "./api-client.js";
import { createClientsNamespace } from "./clients/index.js";

export { ManagementApiError } from "./api-client.js";
export type {
  RequestDescriptor,
  ManagementApiClient,
  ManagementApiClientOptions,
} from "./api-client.js";

export function createManagementApiClient(options: ManagementApiClientOptions) {
  const core: ManagementApiClient = createCoreClient(options);

  return {
    ...core,
    clients: createClientsNamespace(core),
  };
}
