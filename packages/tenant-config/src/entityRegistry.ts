import { createManagementApiClient } from "auth0-config-demo-modules/packages/core/src/index.js";
import type {
  CreateClientParams,
  UpdateClientParams,
} from "auth0-config-demo-modules/packages/core/src/management-api/clients/index.js";

export type Auth0ManagementApiClient = ReturnType<typeof createManagementApiClient>;

// One entry per entity module actually implemented under
// packages/core/src/management-api/ - "pull --all" is exactly this list, so a new entity becomes
// pullable by adding one entry here once its management-api module exists, nothing else.
export interface EntityDefinition {
  // Matches both the --entity flag value and the tenant directory name this entity's files live
  // under (e.g. tenants/<tenant>/clients/*.json).
  name: string;
  list(api: Auth0ManagementApiClient): Promise<Record<string, unknown>[]>;
  get(api: Auth0ManagementApiClient, id: string): Promise<Record<string, unknown>>;
  // Creates a brand-new record (a local file with no identifierField yet) - what `import` uses.
  create(
    api: Auth0ManagementApiClient,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>>;
  // Updates a record that already has an identifierField - what a regular `push` uses.
  update(
    api: Auth0ManagementApiClient,
    id: string,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>>;
  // The field on a record that addresses it for a single `get`/`update` - also what --file pull
  // and push read back out of the file already on disk, and what `import` checks for to decide
  // whether a local file is new.
  identifierField: string;
  // What a pulled record's local filename (without the .json extension) is based on.
  fileName(record: Record<string, unknown>): string;
}

export const ENTITY_REGISTRY: EntityDefinition[] = [
  {
    name: "clients",
    list: (api) => api.clients.list(),
    get: (api, id) => api.clients.get(id),
    create: (api, body) => api.clients.create(body as CreateClientParams),
    update: (api, id, body) => api.clients.update(id, body as UpdateClientParams),
    identifierField: "client_id",
    fileName: (record) => String(record.name),
  },
];

export function findEntityDefinition(name: string): EntityDefinition | undefined {
  return ENTITY_REGISTRY.find((entity) => entity.name === name);
}
