import { strict as assert } from "node:assert";
import { ManagementApiError } from "auth0-config-demo-modules/packages/core/src/index.js";
import type { Auth0ManagementApiClient, EntityDefinition } from "./entityRegistry.js";
import {
  localFileNames,
  readEntityRecord,
  writeEntityRecord,
} from "./localEntityFiles.js";

function requireIdentifier(
  entity: EntityDefinition,
  baseFileName: string,
  record: Record<string, unknown>
): string {
  const id = record[entity.identifierField];
  assert(
    typeof id === "string",
    `"${entity.name}/${baseFileName}.json" is missing "${entity.identifierField}" - ` +
      `it's a new record, so use import to create it, not push.`
  );
  return id;
}

// Updates the one record a local file already represents - the file must already have an
// identifierField (a brand-new file doesn't yet, and needs import instead).
export async function pushSingleFile(
  api: Auth0ManagementApiClient,
  tenantDir: string,
  entity: EntityDefinition,
  baseFileName: string
): Promise<string> {
  const record = await readEntityRecord(tenantDir, entity, baseFileName);
  const id = requireIdentifier(entity, baseFileName, record);
  const updated = await entity.update(api, id, record);
  return writeEntityRecord(tenantDir, entity, updated, baseFileName);
}

// Updates every local file for this entity that already has an identifierField - a new (not yet
// imported) file is left alone and reported separately rather than erroring the whole run, since
// it's expected that a tenant's local config has a mix of both at any given time. Likewise, a 404
// (the local file's record is gone from the tenant) is collected into staleFiles instead of
// aborting the rest of the batch - this module stays prompt-free (see pushSingleFile), so it's the
// caller's call whether/how to confirm deleting those, same as it decides what to do with
// newFiles.
export async function pushEntity(
  api: Auth0ManagementApiClient,
  tenantDir: string,
  entity: EntityDefinition
): Promise<{ pushed: string[]; newFiles: string[]; staleFiles: string[] }> {
  const baseFileNames = await localFileNames(tenantDir, entity);
  const pushed: string[] = [];
  const newFiles: string[] = [];
  const staleFiles: string[] = [];

  for (const baseFileName of baseFileNames) {
    const record = await readEntityRecord(tenantDir, entity, baseFileName);
    if (typeof record[entity.identifierField] !== "string") {
      newFiles.push(baseFileName);
      continue;
    }
    try {
      pushed.push(await pushSingleFile(api, tenantDir, entity, baseFileName));
    } catch (err) {
      if (err instanceof ManagementApiError && err.status === 404) {
        staleFiles.push(baseFileName);
        continue;
      }
      throw err;
    }
  }

  return { pushed, newFiles, staleFiles };
}

// Which local files for this entity don't have an identifierField yet - what `import` offers to
// create, and what push --all/--entity skips over and reports instead of erroring on.
export async function findNewLocalFiles(
  tenantDir: string,
  entity: EntityDefinition
): Promise<string[]> {
  const baseFileNames = await localFileNames(tenantDir, entity);
  const newFiles: string[] = [];
  for (const baseFileName of baseFileNames) {
    const record = await readEntityRecord(tenantDir, entity, baseFileName);
    if (typeof record[entity.identifierField] !== "string") newFiles.push(baseFileName);
  }
  return newFiles;
}

// Creates the one record a local file represents - the file must NOT already have an
// identifierField (an existing record needs push instead, not import). Reads the file again
// after writing the create response back to it, same as every other local-file write, so the
// result always reflects what the tenant actually has, not just what was sent.
export async function importSingleFile(
  api: Auth0ManagementApiClient,
  tenantDir: string,
  entity: EntityDefinition,
  baseFileName: string
): Promise<string> {
  const record = await readEntityRecord(tenantDir, entity, baseFileName);
  assert(
    typeof record[entity.identifierField] !== "string",
    `"${entity.name}/${baseFileName}.json" already has "${entity.identifierField}" - it's an ` +
      `existing record, so use push to update it, not import.`
  );
  const created = await entity.create(api, record);
  return writeEntityRecord(tenantDir, entity, created, baseFileName);
}

// Imports every new local file for this entity, one at a time (not in parallel) - each creation
// has to be read back and written to disk before the next one starts, both because that's the
// only way a create's own result is ever seen and because two new records are never assumed to
// be independent of each other.
export async function importAllNewFiles(
  api: Auth0ManagementApiClient,
  tenantDir: string,
  entity: EntityDefinition
): Promise<string[]> {
  const newFiles = await findNewLocalFiles(tenantDir, entity);
  const created: string[] = [];
  for (const baseFileName of newFiles) {
    created.push(await importSingleFile(api, tenantDir, entity, baseFileName));
  }
  return created;
}
