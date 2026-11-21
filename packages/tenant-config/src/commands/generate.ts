import { strict as assert } from "node:assert";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import type { Command } from "commander";
import {
  PromptSession,
  readTenantEnv,
} from "auth0-config-demo-modules/packages/core/src/index.js";
import { resolveTenantDirectory } from "../bootstrapTenant.js";
import { handleAction } from "../generate/entity-handlers/actions.js";
import { handleClient } from "../generate/entity-handlers/clients.js";
import { handleGrant } from "../generate/entity-handlers/grants.js";
import { handleSolution } from "../generate/entity-handlers/solutions.js";
import { handleTokenExchangeProfile } from "../generate/entity-handlers/tokenExchangeProfiles.js";
import { getTemplateTypes, getTemplatesForType } from "../generate/templateSelection.js";

interface GenerateOptions {
  tenant?: string;
  dir?: string;
  import: boolean;
}

// Templates live in a separate, privately-cloned repo - this assumes it's checked out as a
// sibling of this project's own directory. --dir overrides that for a different checkout location.
function resolveTemplatesDir(dirOption?: string): string {
  const templatesDir = dirOption
    ? resolve(process.cwd(), dirOption)
    : resolve(process.cwd(), "..", "auth0-templates", "templates");
  assert(existsSync(templatesDir), `No templates directory found at: ${templatesDir}`);
  return templatesDir;
}

async function runGenerate(
  options: GenerateOptions,
  prompts: PromptSession
): Promise<void> {
  assert(!options.import, "--import is not implemented yet.");

  const templatesDir = resolveTemplatesDir(options.dir);
  const templateNames = readdirSync(templatesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name);
  assert(templateNames.length > 0, `No templates found in ${templatesDir}`);

  const tenantsRoot = join(process.cwd(), "tenants");
  const { tenantDir } = await resolveTenantDirectory(
    tenantsRoot,
    prompts,
    options.tenant
  );

  const type = await prompts.select(
    "Select an entity type:",
    getTemplateTypes(templateNames).map((type) => ({ label: type, value: type }))
  );
  const selected = await prompts.select(
    "Select a template:",
    getTemplatesForType(templateNames, type)
  );
  const templateDir = join(templatesDir, selected);

  if (type === "Action") {
    await handleAction(templateDir, tenantDir, prompts);
  } else if (type === "Solution") {
    await handleSolution(templateDir, tenantDir, templatesDir, prompts);
  } else if (type === "Client") {
    await handleClient(templateDir, tenantDir, prompts);
  } else if (type === "Grant") {
    const env = await readTenantEnv(tenantDir);
    await handleGrant(templateDir, tenantDir, env.TENANT_DOMAIN ?? "", prompts);
  } else if (type === "Token Exchange") {
    await handleTokenExchangeProfile(templateDir, tenantDir, prompts);
  } else {
    assert(false, `No handler implemented for type: "${type}"`);
  }
}

export function registerGenerateCommand(program: Command): void {
  program
    .command("generate")
    .description("Generate local tenant config files from a source directory.")
    .option("--tenant <name>", "tenant directory name (skips interactive selection)")
    .option("--dir <path>", "directory to read source templates from")
    .option(
      "--import",
      "push the generated files immediately after generating them",
      false
    )
    .action(async (options: GenerateOptions) => {
      const prompts = new PromptSession();
      try {
        await runGenerate(options, prompts);
      } finally {
        prompts.close();
      }
    });
}
