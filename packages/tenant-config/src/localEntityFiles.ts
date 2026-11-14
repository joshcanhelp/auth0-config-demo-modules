import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import {
  printStepInfo,
  type PromptSession,
} from "auth0-config-demo-modules/packages/core/src/index.js";
import { ENTITY_REGISTRY, type EntityDefinition } from "./entityRegistry.js";
import { sortKeysDeep } from "./sortKeysDeep.js";

// Local-file I/O shared by both pull and push, so neither depends on the other - each builds on
// this the same way.

async function removeFileIfExists(filePath: string, message: string): Promise<void> {
  try {
    await unlink(filePath);
    printStepInfo(message);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

// A record's local filename is derived from its own content (entity.fileName - a client's .name,
// say), so a record whose name changes moves to a new filename - without this, the old one would
// never be removed and both would exist side by side.
//
// When the caller already knows which file it started from (pullSingleFile, pushSingleFile -
// they're given a baseFileName) that's used directly: the one unambiguous way to know "this is
// the file that just moved," regardless of whatever else is already on disk. A bulk operation
// with no single starting file (pullEntity, listing fresh from the API) falls back to checking
// whether the file about to be written already holds this record (the common case, skip the
// scan), then scanning for a stale file elsewhere under a different name.
async function removeStaleFile(
  tenantDir: string,
  entity: EntityDefinition,
  id: string,
  targetFilePath: string,
  previousBaseFileName?: string
): Promise<void> {
  const dir = join(tenantDir, entity.name);

  if (previousBaseFileName !== undefined) {
    const previousFilePath = join(dir, `${previousBaseFileName}.json`);
    if (previousFilePath === targetFilePath) return;
    await removeFileIfExists(
      previousFilePath,
      `Removed "${entity.name}/${previousBaseFileName}.json" - this record is now ` +
        `"${entity.name}/${basename(targetFilePath)}".`
    );
    return;
  }

  try {
    const atTarget = JSON.parse(await readFile(targetFilePath, "utf-8")) as Record<
      string,
      unknown
    >;
    if (atTarget[entity.identifierField] === id) return;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  for (const baseFileName of await localFileNames(tenantDir, entity)) {
    const filePath = join(dir, `${baseFileName}.json`);
    if (filePath === targetFilePath) continue;

    let existing: Record<string, unknown>;
    try {
      existing = JSON.parse(await readFile(filePath, "utf-8")) as Record<string, unknown>;
    } catch {
      continue; // not valid JSON - not a record we can compare, leave it alone
    }

    if (existing[entity.identifierField] === id) {
      await removeFileIfExists(
        filePath,
        `Removed "${entity.name}/${baseFileName}.json" - this record is now ` +
          `"${entity.name}/${basename(targetFilePath)}".`
      );
      return;
    }
  }
}

// `previousBaseFileName` - pass it when the caller already knows which file (if any) it started
// from (see removeStaleFile above); omit it only when there genuinely isn't one (a bulk pull
// listing fresh from the API, or a brand-new record from import).
export async function writeEntityRecord(
  tenantDir: string,
  entity: EntityDefinition,
  record: Record<string, unknown>,
  previousBaseFileName?: string
): Promise<string> {
  const dir = join(tenantDir, entity.name);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, `${entity.fileName(record)}.json`);

  const id = record[entity.identifierField];
  if (typeof id === "string") {
    await removeStaleFile(tenantDir, entity, id, filePath, previousBaseFileName);
  }

  await writeFile(filePath, JSON.stringify(sortKeysDeep(record), null, 2) + "\n");
  return filePath;
}

export async function readEntityRecord(
  tenantDir: string,
  entity: EntityDefinition,
  baseFileName: string
): Promise<Record<string, unknown>> {
  const filePath = join(tenantDir, entity.name, `${baseFileName}.json`);
  return JSON.parse(await readFile(filePath, "utf-8")) as Record<string, unknown>;
}

// Called when a 404 reveals a local file's record no longer exists on the tenant - asks before
// deleting, since unlike every other local-file write in this module, this one discards work
// instead of refreshing or replacing it. Returns whether it was actually deleted, so a caller
// looping over several of these can report what it did.
export async function confirmAndRemoveMissingRecord(
  prompts: PromptSession,
  tenantDir: string,
  entity: EntityDefinition,
  baseFileName: string
): Promise<boolean> {
  const confirmed = await prompts.confirm(
    `"${entity.name}/${baseFileName}.json" no longer exists on the tenant - delete the local file?`
  );
  if (confirmed) {
    await unlink(join(tenantDir, entity.name, `${baseFileName}.json`));
  }
  return confirmed;
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
