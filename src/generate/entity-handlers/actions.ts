import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import process from "node:process";

import { textPrompt } from "../../scripts/utils/textPrompt.js";

function isValidFilename(name: string): boolean {
  if (!name) return false;
  return !/[/\\:*?"<>|]/.test(name);
}

function deriveDefaultName(templateDir: string): string {
  const parts = basename(templateDir).split(" > ");
  const trigger = parts[1] ?? "";
  const subname = parts.slice(2).join(" > ");
  return `[${trigger}] ${subname}`;
}

export async function handleAction(
  templateDir: string,
  tenantDir: string
): Promise<void> {
  const metadataPath = join(templateDir, "metadata.json");
  const codePath = join(templateDir, "code.js");

  if (!existsSync(metadataPath)) {
    console.error(`No metadata.json found in template: ${templateDir}`);
    process.exit(1);
  }

  if (!existsSync(codePath)) {
    console.error(`No code.js found in template: ${templateDir}`);
    process.exit(1);
  }

  const defaultName = deriveDefaultName(templateDir);
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

  const {
    name: _name,
    code: _code,
    ...metadata
  } = JSON.parse(readFileSync(metadataPath, "utf-8")) as Record<string, unknown>;
  void _name;
  void _code;

  const output = {
    ...metadata,
    name,
    code: `./actions/${name}/code.js`,
  };

  if (!existsSync(actionsDir)) {
    mkdirSync(actionsDir, { recursive: true });
  }

  mkdirSync(outputCodeDir, { recursive: true });

  writeFileSync(outputJsonPath, JSON.stringify(output, null, 2) + "\n");
  copyFileSync(codePath, outputCodePath);

  console.log(`\nCreated: ${outputJsonPath}`);
  console.log(`Created: ${outputCodePath}`);
}
