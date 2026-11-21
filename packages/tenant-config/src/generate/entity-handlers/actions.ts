import { strict as assert } from "node:assert";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import type { PromptSession } from "auth0-config-demo-modules/packages/core/src/index.js";

function isValidFilename(name: string): boolean {
  if (!name) return false;
  return !/[/\\:*?"<>|]/.test(name);
}

export function deriveActionName(templateDir: string): string {
  const parts = basename(templateDir).split(" > ");
  const trigger = parts[1] ?? "";
  const subname = parts.slice(2).join(" > ");
  return `[${trigger}] ${subname}`;
}

export function writeAction(templateDir: string, tenantDir: string, name: string): void {
  const metadataPath = join(templateDir, "metadata.json");
  const codePath = join(templateDir, "code.js");

  assert(existsSync(metadataPath), `No metadata.json found in template: ${templateDir}`);
  assert(existsSync(codePath), `No code.js found in template: ${templateDir}`);

  const actionsDir = join(tenantDir, "actions");
  const outputJsonPath = join(actionsDir, `${name}.json`);
  const outputCodeDir = join(actionsDir, name);
  const outputCodePath = join(outputCodeDir, "code.js");

  assert(!existsSync(outputJsonPath), `File already exists: ${outputJsonPath}`);

  const {
    name: _name,
    code: _code,
    id: _id,
    ...metadata
  } = JSON.parse(readFileSync(metadataPath, "utf-8")) as Record<string, unknown>;
  void _name;
  void _code;
  void _id;

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

  console.log(`Created: ${outputJsonPath}`);
  console.log(`Created: ${outputCodePath}`);
}

export async function handleAction(
  templateDir: string,
  tenantDir: string,
  prompts: PromptSession
): Promise<void> {
  const defaultName = deriveActionName(templateDir);
  const nameInput = await prompts.text(`Action name (default: ${defaultName})`);
  const name = nameInput || defaultName;

  assert(isValidFilename(name), `Invalid name for a filename: "${name}"`);

  writeAction(templateDir, tenantDir, name);
}
