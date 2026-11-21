import { strict as assert } from "node:assert";
import { resolve } from "node:path";
import type { PromptSession } from "auth0-config-demo-modules/packages/core/src/index.js";
import {
  ENTITY_REGISTRY,
  findEntityDefinition,
  type EntityDefinition,
} from "./entityRegistry.js";
import { localEntityNames, localFileNames } from "./localEntityFiles.js";
import { resolveFileTarget } from "./resolveFileTarget.js";

export interface WatchTarget {
  entity: EntityDefinition;
  // Only these base file names (without ".json") are reacted to - undefined means every file
  // already in (or later added to) the entity's directory.
  fileNames?: Set<string>;
}

function requireEntity(name: string): EntityDefinition {
  const entity = findEntityDefinition(name);
  assert(
    entity,
    `Unknown entity "${name}". Known entities: ${ENTITY_REGISTRY.map((e) => e.name).join(", ")}`
  );
  return entity;
}

// One WatchTarget per distinct entity - --file can name several files under the same entity, so
// their fileNames are merged into a single target rather than one target (and one fs.watch) per
// file.
export function targetsFromFiles(
  tenantsRoot: string,
  filePaths: string[]
): WatchTarget[] {
  const byEntity = new Map<string, WatchTarget>();

  for (const filePath of filePaths) {
    const { entityName, baseFileName } = resolveFileTarget(
      resolve(filePath),
      tenantsRoot
    );
    const entity = requireEntity(entityName);
    const existing = byEntity.get(entity.name);
    if (existing) {
      existing.fileNames?.add(baseFileName);
    } else {
      byEntity.set(entity.name, { entity, fileNames: new Set([baseFileName]) });
    }
  }

  return [...byEntity.values()];
}

async function promptForTargets(
  tenantDir: string,
  prompts: PromptSession
): Promise<WatchTarget[]> {
  const mode = await prompts.select<"file" | "entity" | "all">(
    "What do you want to watch?",
    [
      { label: "A specific file", value: "file" },
      { label: "A specific entity type", value: "entity" },
      { label: "Everything already here locally", value: "all" },
    ]
  );

  if (mode === "all") {
    const names = await localEntityNames(tenantDir);
    assert(
      names.length > 0,
      "Nothing local to watch - no entity directories exist yet for this tenant."
    );
    return names.map((name) => ({ entity: requireEntity(name) }));
  }

  if (mode === "entity") {
    const entity = await prompts.select(
      "Which entity type?",
      ENTITY_REGISTRY.map((e) => ({ label: e.name, value: e }))
    );
    return [{ entity }];
  }

  // mode === "file"
  const localNames = await localEntityNames(tenantDir);
  assert(
    localNames.length > 0,
    "No local entity directories exist yet to pick a file from."
  );
  const entityName = await prompts.select(
    "Which entity type?",
    localNames.map((name) => ({ label: name, value: name }))
  );
  const entity = requireEntity(entityName);
  const fileNames = await localFileNames(tenantDir, entity);
  assert(fileNames.length > 0, `No local files exist yet for "${entityName}".`);
  const baseFileName = await prompts.select(
    "Which file?",
    fileNames.map((name) => ({ label: name, value: name }))
  );
  return [{ entity, fileNames: new Set([baseFileName]) }];
}

export interface WatchTargetOptions {
  file?: string[];
  entity?: string[];
}

// Resolves what watch should set up an fs.watch for: explicit --file paths (grouped by entity),
// explicit --entity names, or an interactive pick when neither flag was given.
export async function resolveWatchTargets(
  tenantsRoot: string,
  tenantDir: string,
  options: WatchTargetOptions,
  prompts: PromptSession
): Promise<WatchTarget[]> {
  const modesGiven = [options.file, options.entity].filter(
    (value) => value && value.length > 0
  ).length;
  assert(modesGiven <= 1, "Pass only one of --file or --entity.");

  if (options.file && options.file.length > 0) {
    return targetsFromFiles(tenantsRoot, options.file);
  }

  if (options.entity && options.entity.length > 0) {
    return options.entity.map((name) => ({ entity: requireEntity(name) }));
  }

  return promptForTargets(tenantDir, prompts);
}
