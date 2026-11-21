import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

export function deriveFlowName(templateDir: string): string {
  const parts = basename(templateDir).split(" > ");
  return parts.slice(1).join(" > ");
}

export function writeFlow(templateDir: string, tenantDir: string, name: string): void {
  const flowPath = join(templateDir, "flow.json");
  assert(existsSync(flowPath), `No flow.json found in template: ${templateDir}`);

  const flowsDir = join(tenantDir, "flows");
  const outputPath = join(flowsDir, `${name}.json`);
  assert(!existsSync(outputPath), `File already exists: ${outputPath}`);

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
