import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

export function deriveFormName(templateDir: string): string {
  const parts = basename(templateDir).split(" > ");
  return parts.slice(1).join(" > ");
}

export function writeForm(templateDir: string, tenantDir: string, name: string): void {
  const formPath = join(templateDir, "form.json");
  assert(existsSync(formPath), `No form.json found in template: ${templateDir}`);

  const formsDir = join(tenantDir, "forms");
  const outputPath = join(formsDir, `${name}.json`);
  assert(!existsSync(outputPath), `File already exists: ${outputPath}`);

  const { id: _id, ...template } = JSON.parse(readFileSync(formPath, "utf-8")) as Record<
    string,
    unknown
  >;
  void _id;

  const output = { ...template, name };

  if (!existsSync(formsDir)) {
    mkdirSync(formsDir, { recursive: true });
  }

  writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`Created: ${outputPath}`);
}
