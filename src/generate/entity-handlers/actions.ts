import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

import { textPrompt } from "../../scripts/utils/textPrompt.js";

function isValidFilename(name: string): boolean {
  if (!name) return false;
  return !/[/\\:*?"<>|]/.test(name);
}

export async function handleAction(templateDir: string, tenantDir: string): Promise<void> {
  const actionsTemplateDir = join(templateDir, "actions");

  if (!existsSync(actionsTemplateDir)) {
    console.error("No actions directory found in template.");
    process.exit(1);
  }

  const jsonFiles = readdirSync(actionsTemplateDir).filter((f) => f.endsWith(".json"));

  if (jsonFiles.length === 0) {
    console.error("No action JSON found in template actions directory.");
    process.exit(1);
  }

  const templateFileName = jsonFiles[0]!;
  const defaultName = templateFileName.replace(/\.json$/, "");
  const nameInput = await textPrompt(`Action name (default: ${defaultName})`);
  const name = nameInput || defaultName;

  if (!isValidFilename(name)) {
    console.error(`Invalid name for a filename: "${name}"`);
    process.exit(1);
  }

  const actionsDir = join(tenantDir, "actions");
  const outputJsonPath = join(actionsDir, `${name}.json`);
  const outputCodeDir = join(actionsDir, name);
  const outputCodePath = join(outputCodeDir, "code.js");

  if (existsSync(outputJsonPath)) {
    console.error(`File already exists: ${outputJsonPath}`);
    process.exit(1);
  }

  const template = JSON.parse(
    readFileSync(join(actionsTemplateDir, templateFileName), "utf-8")
  ) as Record<string, unknown>;

  const templateCodeDir = join(actionsTemplateDir, defaultName);
  const templateCodePath = join(templateCodeDir, "code.js");

  if (!existsSync(templateCodePath)) {
    console.error(`No code.js found at: ${templateCodePath}`);
    process.exit(1);
  }

  if (!existsSync(actionsDir)) {
    mkdirSync(actionsDir, { recursive: true });
  }

  mkdirSync(outputCodeDir, { recursive: true });

  const output = {
    ...template,
    name,
    code: `./actions/${name}/code.js`,
  };

  writeFileSync(outputJsonPath, JSON.stringify(output, null, 2) + "\n");
  copyFileSync(templateCodePath, outputCodePath);

  console.log(`\nCreated: ${outputJsonPath}`);
  console.log(`Created: ${outputCodePath}`);
}
