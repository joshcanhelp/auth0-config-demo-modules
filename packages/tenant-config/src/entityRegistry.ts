import { createManagementApiClient } from "auth0-demo-core";

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
  // The field on a record that addresses it for a single `get` - also what a --file pull reads
  // back out of the file already on disk to know what to re-fetch.
  identifierField: string;
  // What a pulled record's local filename (without the .json extension) is based on.
  fileName(record: Record<string, unknown>): string;
}

export const ENTITY_REGISTRY: EntityDefinition[] = [
  {
    name: "clients",
    list: (api) => api.clients.list(),
    get: (api, id) => api.clients.get(id),
    identifierField: "client_id",
    fileName: (record) => String(record.name),
  },
];

export function findEntityDefinition(name: string): EntityDefinition | undefined {
  return ENTITY_REGISTRY.find((entity) => entity.name === name);
}
