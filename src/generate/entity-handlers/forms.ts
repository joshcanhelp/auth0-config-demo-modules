import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import process from "node:process";

export function deriveFormName(templateDir: string): string {
  const parts = basename(templateDir).split(" > ");
  return parts.slice(1).join(" > ");
}

export function writeForm(templateDir: string, tenantDir: string, name: string): void {
  const formPath = join(templateDir, "form.json");

  if (!existsSync(formPath)) {
    console.error(`No form.json found in template: ${templateDir}`);
    process.exit(1);
  }

  const formsDir = join(tenantDir, "forms");
  const outputPath = join(formsDir, `${name}.json`);

  if (existsSync(outputPath)) {
    console.error(`File already exists: ${outputPath}`);
    process.exit(1);
  }

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
