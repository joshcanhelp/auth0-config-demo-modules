import { strict as assert } from "node:assert";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  ENTITY_REGISTRY,
  type Auth0ManagementApiClient,
  type EntityDefinition,
} from "./entityRegistry.js";
import { sortKeysDeep } from "./sortKeysDeep.js";

async function writeEntityRecord(
  tenantDir: string,
  entity: EntityDefinition,
  record: Record<string, unknown>
): Promise<string> {
  const dir = join(tenantDir, entity.name);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, `${entity.fileName(record)}.json`);
  await writeFile(filePath, JSON.stringify(sortKeysDeep(record), null, 2) + "\n");
  return filePath;
}

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
  const filePath = join(tenantDir, entity.name, `${baseFileName}.json`);
  const existing = JSON.parse(await readFile(filePath, "utf-8")) as Record<
    string,
    unknown
  >;
  const id = existing[entity.identifierField];
  assert(typeof id === "string", `"${filePath}" is missing "${entity.identifierField}"`);

  const record = await entity.get(api, id);
  return writeEntityRecord(tenantDir, entity, record);
}

async function readSubdirectoryNames(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function readFileNames(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

// Which registered entity types already have a directory for this tenant - what "pull --local"
// pulls, and what a bare `pull`'s "specific entity" prompt offers to pick a file from.
export async function localEntityNames(tenantDir: string): Promise<string[]> {
  const subdirectories = new Set(await readSubdirectoryNames(tenantDir));
  return ENTITY_REGISTRY.map((entity) => entity.name).filter((name) =>
    subdirectories.has(name)
  );
}

export async function localFileNames(
  tenantDir: string,
  entity: EntityDefinition
): Promise<string[]> {
  const entries = await readFileNames(join(tenantDir, entity.name));
  return entries
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -".json".length));
}
