import { strict as assert } from "node:assert";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { PromptSession } from "auth0-config-demo-modules/packages/core/src/index.js";
import { deriveActionName, writeAction } from "./actions.js";
import { deriveFlowName, writeFlow } from "./flows.js";
import { deriveFormName, writeForm } from "./forms.js";

interface SolutionEntryOptions {
  name?: string;
  optional?: boolean;
}

type SolutionManifest = string[] | Record<string, SolutionEntryOptions | null>;

function readSolutionManifest(templateDir: string): SolutionManifest | undefined {
  const manifestPath = join(templateDir, "solution.json");
  if (!existsSync(manifestPath)) return undefined;
  return JSON.parse(readFileSync(manifestPath, "utf-8")) as SolutionManifest;
}

function manifestEntries(
  manifest: SolutionManifest
): [templateName: string, options: SolutionEntryOptions][] {
  if (Array.isArray(manifest)) {
    return manifest.map((templateName) => [templateName, {}]);
  }
  return Object.entries(manifest).map(([templateName, options]) => [
    templateName,
    options ?? {},
  ]);
}

async function writeEntity(
  templateName: string,
  templateDir: string,
  tenantDir: string,
  options: SolutionEntryOptions,
  prompts: PromptSession
): Promise<void> {
  const [type] = templateName.split(" > ");
  const name =
    options.name ??
    (type === "Action"
      ? deriveActionName(templateDir)
      : type === "Flow"
        ? deriveFlowName(templateDir)
        : type === "Form"
          ? deriveFormName(templateDir)
          : templateName);

  if (options.optional) {
    const create = await prompts.confirm(`Create "${name}"?`);
    if (!create) {
      console.log(`Skipping: "${name}"`);
      return;
    }
  }

  if (type === "Action") {
    writeAction(templateDir, tenantDir, name);
  } else if (type === "Flow") {
    writeFlow(templateDir, tenantDir, name);
  } else if (type === "Form") {
    writeForm(templateDir, tenantDir, name);
  } else {
    console.log(`Skipping unknown entity type: "${templateName}"`);
  }
}

export async function handleSolution(
  templateDir: string,
  tenantDir: string,
  templatesDir: string,
  prompts: PromptSession
): Promise<void> {
  const manifest = readSolutionManifest(templateDir);

  if (manifest) {
    const entries = manifestEntries(manifest);

    const missing = entries
      .map(([templateName]) => templateName)
      .filter((templateName) => !existsSync(join(templatesDir, templateName)));

    assert(
      missing.length === 0,
      `Templates referenced in solution.json not found:\n${missing
        .map((templateName) => `  - ${templateName}`)
        .join("\n")}`
    );

    for (const [templateName, options] of entries) {
      await writeEntity(
        templateName,
        join(templatesDir, templateName),
        tenantDir,
        options,
        prompts
      );
    }

    return;
  }

  const subdirs = readdirSync(templateDir, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory() && !entry.name.startsWith(".")
  );

  for (const subdir of subdirs) {
    await writeEntity(
      subdir.name,
      join(templateDir, subdir.name),
      tenantDir,
      {},
      prompts
    );
  }
}
