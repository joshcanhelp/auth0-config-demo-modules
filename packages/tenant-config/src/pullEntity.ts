import { strict as assert } from "node:assert";
import type { Auth0ManagementApiClient, EntityDefinition } from "./entityRegistry.js";
import {
  localFileNames,
  readEntityRecord,
  writeEntityRecord,
} from "./localEntityFiles.js";

// Writes one file per record currently in the tenant - a rename (the record's own name, and so
// its filename, changed on the tenant) is cleaned up automatically by writeEntityRecord's scan
// fallback. A local file whose id isn't in this list at all (the record was deleted from the
// tenant) is never removed here, only collected into staleFiles - same split as pushEntity, and
// for the same reason: this module stays prompt-free, so it's the caller's call whether/how to
// confirm deleting those.
export async function pullEntity(
  api: Auth0ManagementApiClient,
  tenantDir: string,
  entity: EntityDefinition
): Promise<{ pulled: string[]; staleFiles: string[] }> {
  const records = await entity.list(api);
  const pulled: string[] = [];
  for (const record of records) {
    pulled.push(await writeEntityRecord(tenantDir, entity, record));
  }

  const remoteIds = new Set(
    records
      .map((record) => record[entity.identifierField])
      .filter((id): id is string => typeof id === "string")
  );

  const staleFiles: string[] = [];
  for (const baseFileName of await localFileNames(tenantDir, entity)) {
    const record = await readEntityRecord(tenantDir, entity, baseFileName);
    const id = record[entity.identifierField];
    if (typeof id === "string" && !remoteIds.has(id)) {
      staleFiles.push(baseFileName);
    }
  }

  return { pulled, staleFiles };
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
