import { strict as assert } from "node:assert";
import { join, resolve } from "node:path";
import type { Command } from "commander";
import {
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
  localEntityNames,
  localFileNames,
  pullEntity,
  pullSingleFile,
} from "../pullEntity.js";
import { resolveFileTarget } from "../resolveFileTarget.js";

interface PullOptions {
  tenant?: string;
  file?: string;
  entity?: string[];
  local: boolean;
  all: boolean;
}

function requireEntity(name: string): EntityDefinition {
  const entity = findEntityDefinition(name);
  assert(
    entity,
    `Unknown entity "${name}". Known entities: ${ENTITY_REGISTRY.map((e) => e.name).join(", ")}`
  );
  return entity;
}

async function pullAndReport(
  api: Auth0ManagementApiClient,
  tenantDir: string,
  entity: EntityDefinition
): Promise<void> {
  const paths = await pullEntity(api, tenantDir, entity);
  printStepDone(
    `Pulled ${paths.length} ${entity.name} file${paths.length === 1 ? "" : "s"}`
  );
}

// The bare `pull` fallback when none of --file/--entity/--local/--all were given - always reads
// what's local to build its menus, same as --file/--entity do when a value is actually typed out.
async function promptAndPull(
  api: Auth0ManagementApiClient,
  tenantDir: string,
  prompts: PromptSession
): Promise<void> {
  const mode = await prompts.select<"file" | "entity" | "local" | "all">(
    "What do you want to pull?",
    [
      { label: "A specific file", value: "file" },
      { label: "A specific entity type", value: "entity" },
      { label: "Everything already here locally", value: "local" },
      { label: "Everything this CLI supports", value: "all" },
    ]
  );

  if (mode === "all") {
    for (const entity of ENTITY_REGISTRY) await pullAndReport(api, tenantDir, entity);
    return;
  }

  if (mode === "local") {
    const names = await localEntityNames(tenantDir);
    assert(
      names.length > 0,
      "Nothing local to pull - no entity directories exist yet for this tenant."
    );
    for (const name of names) await pullAndReport(api, tenantDir, requireEntity(name));
    return;
  }

  if (mode === "entity") {
    const entity = await prompts.select(
      "Which entity type?",
      ENTITY_REGISTRY.map((e) => ({ label: e.name, value: e }))
    );
    await pullAndReport(api, tenantDir, entity);
    return;
  }

  const localNames = await localEntityNames(tenantDir);
  assert(
    localNames.length > 0,
    "No local entity directories exist yet to pick a file from - pull an entity type first."
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
  const filePath = await pullSingleFile(api, tenantDir, entity, baseFileName);
  printStepDone(`Pulled ${filePath}`);
}

async function runPull(options: PullOptions, prompts: PromptSession): Promise<void> {
  const modesGiven = [
    options.file,
    options.entity,
    options.local || null,
    options.all || null,
  ].filter(Boolean).length;
  assert(modesGiven <= 1, "Pass only one of --file, --entity, --local, or --all.");

  const tenantsRoot = join(process.cwd(), "tenants");

  if (options.file) {
    const target = resolveFileTarget(resolve(options.file), tenantsRoot);
    assert(
      !options.tenant || options.tenant === target.tenantName,
      `--tenant "${options.tenant}" doesn't match the tenant in --file's path ("${target.tenantName}")`
    );
    const { tenantDir, api } = await bootstrapTenant(
      tenantsRoot,
      prompts,
      target.tenantName
    );
    const filePath = await pullSingleFile(
      api,
      tenantDir,
      requireEntity(target.entityName),
      target.baseFileName
    );
    printStepDone(`Pulled ${filePath}`);
    return;
  }

  const { tenantDir, api } = await bootstrapTenant(tenantsRoot, prompts, options.tenant);

  if (options.entity && options.entity.length > 0) {
    for (const name of options.entity)
      await pullAndReport(api, tenantDir, requireEntity(name));
    return;
  }

  if (options.local) {
    const names = await localEntityNames(tenantDir);
    if (names.length === 0) {
      printStepInfo(
        "Nothing local to pull - no entity directories exist yet for this tenant."
      );
      return;
    }
    for (const name of names) await pullAndReport(api, tenantDir, requireEntity(name));
    return;
  }

  if (options.all) {
    for (const entity of ENTITY_REGISTRY) await pullAndReport(api, tenantDir, entity);
    return;
  }

  await promptAndPull(api, tenantDir, prompts);
}

export function registerPullCommand(program: Command): void {
  program
    .command("pull")
    .description(
      "Pull tenant config from Auth0 into local files (read-only against the API)."
    )
    .option("--tenant <name>", "tenant directory name (skips interactive selection)")
    .option("--file <path>", "pull only the entity whose local file this is")
    .option("--entity <name...>", "pull only these entity types")
    .option("--local", "limit to entity types/files that already exist locally", false)
    .option("--all", "pull every entity type the tenant supports", false)
    .action(async (options: PullOptions) => {
      const prompts = new PromptSession();
      try {
        await runPull(options, prompts);
      } finally {
        prompts.close();
      }
    });
}
