import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import process from "node:process";

export function deriveFlowName(templateDir: string): string {
  const parts = basename(templateDir).split(" > ");
  return parts.slice(1).join(" > ");
}

export function writeFlow(templateDir: string, tenantDir: string, name: string): void {
  const flowPath = join(templateDir, "flow.json");

  if (!existsSync(flowPath)) {
    console.error(`No flow.json found in template: ${templateDir}`);
    process.exit(1);
  }

  const flowsDir = join(tenantDir, "flows");
  const outputPath = join(flowsDir, `${name}.json`);

  if (existsSync(outputPath)) {
    console.error(`File already exists: ${outputPath}`);
    process.exit(1);
  }

  const { id: _id, ...template } = JSON.parse(readFileSync(flowPath, "utf-8")) as Record<
    string,
    unknown
  >;
  void _id;

  const output = { ...template, name };

  if (!existsSync(flowsDir)) {
    mkdirSync(flowsDir, { recursive: true });
  }

  writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`Created: ${outputPath}`);
}
