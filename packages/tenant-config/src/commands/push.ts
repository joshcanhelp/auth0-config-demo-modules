import { strict as assert } from "node:assert";
import { join, resolve } from "node:path";
import type { Command } from "commander";
import {
  ManagementApiError,
  PromptSession,
  printStepDone,
  printStepInfo,
} from "auth0-config-demo-modules/packages/core/src/index.js";
import { bootstrapTenant } from "../bootstrapTenant.js";
import {
  ENTITY_REGISTRY,
  findEntityDefinition,
  type Auth0ManagementApiClient,
  type EntityDefinition,
} from "../entityRegistry.js";
import {
  confirmAndRemoveMissingRecord,
  localEntityNames,
  localFileNames,
} from "../localEntityFiles.js";
import {
  findNewLocalFiles,
  importAllNewFiles,
  importSingleFile,
  pushEntity,
  pushSingleFile,
} from "../pushEntity.js";
import { resolveFileTarget } from "../resolveFileTarget.js";

interface PushOptions {
  tenant?: string;
  file?: string;
  entity?: string[];
  all: boolean;
  import: boolean;
  changedOnly: boolean;
  delete: boolean;
}

function requireEntity(name: string): EntityDefinition {
  const entity = findEntityDefinition(name);
  assert(
    entity,
    `Unknown entity "${name}". Known entities: ${ENTITY_REGISTRY.map((e) => e.name).join(", ")}`
  );
  return entity;
}

async function pushAndReport(
  api: Auth0ManagementApiClient,
  tenantDir: string,
  entity: EntityDefinition,
  prompts: PromptSession
): Promise<void> {
  const { pushed, newFiles, staleFiles } = await pushEntity(api, tenantDir, entity);
  printStepDone(
    `Pushed ${pushed.length} ${entity.name} file${pushed.length === 1 ? "" : "s"}`
  );
  if (newFiles.length > 0) {
    printStepInfo(
      `Skipped ${newFiles.length} new ${entity.name} file${newFiles.length === 1 ? "" : "s"} - ` +
        `run with --import to create ${newFiles.length === 1 ? "it" : "them"}.`
    );
  }
  for (const baseFileName of staleFiles) {
    await confirmAndRemoveMissingRecord(prompts, tenantDir, entity, baseFileName);
  }
}

// Shared by --file and the interactive "specific file" picker.
async function pushSingleFileOrConfirmDeletion(
  api: Auth0ManagementApiClient,
  tenantDir: string,
  entity: EntityDefinition,
  baseFileName: string,
  prompts: PromptSession
): Promise<void> {
  try {
    const filePath = await pushSingleFile(api, tenantDir, entity, baseFileName);
    printStepDone(`Pushed ${filePath}`);
  } catch (err) {
    if (err instanceof ManagementApiError && err.status === 404) {
      await confirmAndRemoveMissingRecord(prompts, tenantDir, entity, baseFileName);
      return;
    }
    throw err;
  }
}

// Shared by --import and the bare interactive fallback. `entity` is pre-resolved by the caller
// (from --entity, a prompt, or the only registered entity) - this only decides one vs. all
// within that single entity, never across entities (see push.ts's own module comment).
async function importForEntity(
  api: Auth0ManagementApiClient,
  tenantDir: string,
  prompts: PromptSession,
  entity: EntityDefinition,
  importAll: boolean
): Promise<void> {
  if (importAll) {
    const created = await importAllNewFiles(api, tenantDir, entity);
    printStepDone(
      `Imported ${created.length} new ${entity.name} file${created.length === 1 ? "" : "s"}`
    );
    return;
  }

  const newFiles = await findNewLocalFiles(tenantDir, entity);
  assert(
    newFiles.length > 0,
    `No new ${entity.name} files to import - every local file already has a ` +
      `"${entity.identifierField}".`
  );

  const choice = await prompts.select<string>(
    `Which new ${entity.name} file do you want to import?`,
    [
      { label: `All (${newFiles.length})`, value: "__all__" },
      ...newFiles.map((name) => ({ label: name, value: name })),
    ]
  );

  if (choice === "__all__") {
    const created = await importAllNewFiles(api, tenantDir, entity);
    printStepDone(
      `Imported ${created.length} new ${entity.name} file${created.length === 1 ? "" : "s"}`
    );
    return;
  }

  const filePath = await importSingleFile(api, tenantDir, entity, choice);
  printStepDone(`Imported ${filePath}`);
}

async function runImport(
  api: Auth0ManagementApiClient,
  tenantDir: string,
  prompts: PromptSession,
  options: { entity?: string[]; all: boolean }
): Promise<void> {
  const entityName =
    options.entity?.[0] ??
    (ENTITY_REGISTRY.length === 1
      ? ENTITY_REGISTRY[0].name
      : await prompts.select(
          "Which entity type do you want to import new files for?",
          ENTITY_REGISTRY.map((e) => ({ label: e.name, value: e.name }))
        ));

  await importForEntity(api, tenantDir, prompts, requireEntity(entityName), options.all);
}

// The bare `push` fallback when none of --file/--entity/--all/--import were given.
async function promptAndPush(
  api: Auth0ManagementApiClient,
  tenantDir: string,
  prompts: PromptSession
): Promise<void> {
  const mode = await prompts.select<"file" | "entity" | "all" | "import">(
    "What do you want to push?",
    [
      { label: "A specific file", value: "file" },
      { label: "A specific entity type", value: "entity" },
      { label: "Everything already here locally", value: "all" },
      { label: "Import new files", value: "import" },
    ]
  );

  if (mode === "import") {
    await runImport(api, tenantDir, prompts, { all: false });
    return;
  }

  if (mode === "all") {
    const names = await localEntityNames(tenantDir);
    assert(
      names.length > 0,
      "Nothing local to push - no entity directories exist yet for this tenant."
    );
    for (const name of names)
      await pushAndReport(api, tenantDir, requireEntity(name), prompts);
    return;
  }

  if (mode === "entity") {
    const entity = await prompts.select(
      "Which entity type?",
      ENTITY_REGISTRY.map((e) => ({ label: e.name, value: e }))
    );
    await pushAndReport(api, tenantDir, entity, prompts);
    return;
  }

  // mode === "file" - only offer files that are actually pushable (already have an
  // identifierField); a new file belongs to the "Import new files" mode instead.
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
  const allFileNames = await localFileNames(tenantDir, entity);
  const newFileNames = new Set(await findNewLocalFiles(tenantDir, entity));
  const pushableFileNames = allFileNames.filter((name) => !newFileNames.has(name));
  assert(
    pushableFileNames.length > 0,
    `No existing ${entity.name} files to push - use "Import new files" instead.`
  );
  const baseFileName = await prompts.select(
    "Which file?",
    pushableFileNames.map((name) => ({ label: name, value: name }))
  );
  await pushSingleFileOrConfirmDeletion(api, tenantDir, entity, baseFileName, prompts);
}

async function runPush(options: PushOptions, prompts: PromptSession): Promise<void> {
  assert(
    !options.delete,
    '--delete is not implemented yet - it needs a new tenant type ("DELETE") that doesn\'t exist yet.'
  );
  assert(!options.changedOnly, "--changed-only is not implemented yet.");

  const tenantsRoot = join(process.cwd(), "tenants");

  if (options.file) {
    assert(!options.import, "Pass either --file or --import, not both.");
    const target = resolveFileTarget(resolve(options.file), tenantsRoot);
    assert(
      !options.tenant || options.tenant === target.tenantName,
      `--tenant "${options.tenant}" doesn't match the tenant in --file's path ("${target.tenantName}")`
    );
    const { tenantDir, api } = await bootstrapTenant(
      tenantsRoot,
      prompts,
      target.tenantName,
      { requireWriteAccess: true }
    );
    await pushSingleFileOrConfirmDeletion(
      api,
      tenantDir,
      requireEntity(target.entityName),
      target.baseFileName,
      prompts
    );
    return;
  }

  const { tenantDir, api } = await bootstrapTenant(tenantsRoot, prompts, options.tenant, {
    requireWriteAccess: true,
  });

  // --entity/--all are modifiers of --import (which entity, and whether to skip its
  // one-or-all prompt) rather than competing modes, so check for --import first.
  if (options.import) {
    await runImport(api, tenantDir, prompts, options);
    return;
  }

  assert(
    !(options.entity && options.entity.length > 0) || !options.all,
    "Pass only one of --entity or --all."
  );

  if (options.entity && options.entity.length > 0) {
    for (const name of options.entity)
      await pushAndReport(api, tenantDir, requireEntity(name), prompts);
    return;
  }

  if (options.all) {
    const names = await localEntityNames(tenantDir);
    if (names.length === 0) {
      printStepInfo(
        "Nothing local to push - no entity directories exist yet for this tenant."
      );
      return;
    }
    for (const name of names)
      await pushAndReport(api, tenantDir, requireEntity(name), prompts);
    return;
  }

  await promptAndPush(api, tenantDir, prompts);
}

export function registerPushCommand(program: Command): void {
  program
    .command("push")
    .description("Push local tenant config to Auth0.")
    .option("--tenant <name>", "tenant directory name (skips interactive selection)")
    .option("--file <path>", "push only the existing record whose local file this is")
    .option(
      "--entity <name...>",
      "push every existing local record for these entity types"
    )
    .option("--all", "push every existing local record for every entity type", false)
    .option(
      "--import",
      "create new local records (ones with no identifier yet) instead of updating " +
        "existing ones - combine with --all to skip the one-or-all prompt",
      false
    )
    .option("--changed-only", "push only files changed since the last pull/push", false)
    .option(
      "--delete",
      "allow deleting records that exist in the tenant but not locally",
      false
    )
    .action(async (options: PushOptions) => {
      const prompts = new PromptSession();
      try {
        await runPush(options, prompts);
      } finally {
        prompts.close();
      }
    });
}
