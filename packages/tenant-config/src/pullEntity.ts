import { strict as assert } from "node:assert";
import type { Auth0ManagementApiClient, EntityDefinition } from "./entityRegistry.js";
import { readEntityRecord, writeEntityRecord } from "./localEntityFiles.js";

// Writes one file per record currently in the tenant - never deletes a local file for a record
// that's gone from the tenant, so a pull never silently discards local-only work.
export async function pullEntity(
  api: Auth0ManagementApiClient,
  tenantDir: string,
  entity: EntityDefinition
): Promise<string[]> {
  const records = await entity.list(api);
  const paths: string[] = [];
  for (const record of records) {
    paths.push(await writeEntityRecord(tenantDir, entity, record));
  }
  return paths;
}

// Re-fetches just the one record a local file already represents, identified by whatever that
// file currently has saved under the entity's identifierField - then overwrites it in place (its
// filename can change if the record's own name changed on the tenant since the last pull).
export async function pullSingleFile(
  api: Auth0ManagementApiClient,
  tenantDir: string,
  entity: EntityDefinition,
  baseFileName: string
): Promise<string> {
  const existing = await readEntityRecord(tenantDir, entity, baseFileName);
  const id = existing[entity.identifierField];
  assert(
    typeof id === "string",
    `"${tenantDir}/${entity.name}/${baseFileName}.json" is missing "${entity.identifierField}"`
  );

  const record = await entity.get(api, id);
  return writeEntityRecord(tenantDir, entity, record, baseFileName);
}
