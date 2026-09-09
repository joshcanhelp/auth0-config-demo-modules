import process from "node:process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import type { Management } from "auth0";
import chalk from "chalk";

import { selectTenant } from "../scripts/utils/selectTenant.js";
import { selectPrompt } from "../scripts/utils/selectPrompt.js";
import { validateClients, TENANT_TAGS } from "./entity-handlers/clients.js";
import type { TenantTag } from "./entity-handlers/clients.js";
import type { Finding, FindingLevel } from "./types.js";

const entityFlagIndex = process.argv.indexOf("--entity");
const entityFlag =
  entityFlagIndex !== -1 ? (process.argv[entityFlagIndex + 1] ?? null) : null;

const tenantTagFlagIndex = process.argv.indexOf("--tenant-tag");
const tenantTagFlag =
  tenantTagFlagIndex !== -1 ? (process.argv[tenantTagFlagIndex + 1] ?? null) : null;

if (tenantTagFlag !== null && !(TENANT_TAGS as readonly string[]).includes(tenantTagFlag)) {
  console.error(`Invalid --tenant-tag "${tenantTagFlag}". Valid options: ${TENANT_TAGS.join(", ")}`);
  process.exit(1);
}

const tenantTag = tenantTagFlag as TenantTag | undefined;

const { tenantDir } = await selectTenant();

const SUPPORTED_ENTITIES = ["clients"] as const;
type SupportedEntity = (typeof SUPPORTED_ENTITIES)[number];

function getEntityFiles(entity: SupportedEntity): string[] {
  const dir = join(tenantDir, entity);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json"));
}

const availableEntities = SUPPORTED_ENTITIES.filter((e) => getEntityFiles(e).length > 0);

if (availableEntities.length === 0) {
  console.error("No supported entity directories with data found in this tenant.");
  process.exit(1);
}

let selectedEntities: SupportedEntity[];

if (entityFlag !== null) {
  if (entityFlag === "all") {
    selectedEntities = availableEntities;
  } else if (SUPPORTED_ENTITIES.includes(entityFlag as SupportedEntity)) {
    const e = entityFlag as SupportedEntity;
    if (!availableEntities.includes(e)) {
      console.error(`No data found for entity "${entityFlag}" in this tenant.`);
      process.exit(1);
    }
    selectedEntities = [e];
  } else {
    console.error(
      `Invalid --entity "${entityFlag}". Valid options: all, ${SUPPORTED_ENTITIES.join(", ")}`
    );
    process.exit(1);
  }
} else {
  const options = [
    { label: "All", value: "__all__" },
    ...availableEntities.map((e) => ({ label: e, value: e })),
  ];
  const selected = await selectPrompt("Select an entity to validate:", options);
  selectedEntities = selected === "__all__" ? availableEntities : [selected as SupportedEntity];
}

async function loadAndValidate(entity: SupportedEntity): Promise<Finding[]> {
  const files = getEntityFiles(entity);

  if (entity === "clients") {
    const clients = files.map(
      (f) => JSON.parse(readFileSync(join(tenantDir, entity, f), "utf-8")) as Management.Client
    );
    console.log(`Validating ${clients.length} client(s)...`);
    return validateClients(clients, tenantTag);
  }

  return [];
}

const findings: Finding[] = (await Promise.all(selectedEntities.map(loadAndValidate))).flat();

const LEVEL_ORDER: Record<FindingLevel, number> = {
  critical: 0,
  important: 1,
  recommended: 2,
  informational: 3,
};

const LEVEL_COLOR: Record<FindingLevel, chalk.Chalk> = {
  critical: chalk.red.bold,
  important: chalk.yellow,
  recommended: chalk.cyan,
  informational: chalk.gray,
};

const sorted = [...findings].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

if (sorted.length === 0) {
  console.log(chalk.green("No issues found."));
  process.exit(0);
}

const counts: Record<FindingLevel, number> = {
  critical: 0,
  important: 0,
  recommended: 0,
  informational: 0,
};

for (const f of sorted) counts[f.level]++;

console.log("\nSummary:");
console.log(`  ${LEVEL_COLOR.critical(`Critical:      ${counts.critical}`)}`);
console.log(`  ${LEVEL_COLOR.important(`Important:     ${counts.important}`)}`);
console.log(`  ${LEVEL_COLOR.recommended(`Recommended:   ${counts.recommended}`)}`);
console.log(`  ${LEVEL_COLOR.informational(`Informational: ${counts.informational}`)}`);
console.log("");

for (const finding of sorted) {
  const color = LEVEL_COLOR[finding.level];
  console.log(color(`[${finding.level.toUpperCase()}] ${finding.clientName} - ${finding.message}`));
}
