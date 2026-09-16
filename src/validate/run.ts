import process from "node:process";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

import type { Management } from "auth0";
import chalk from "chalk";

import { selectTenant } from "../scripts/utils/selectTenant.js";
import { selectPrompt } from "../scripts/utils/selectPrompt.js";
import { validateClients, TENANT_TAGS } from "./entity-handlers/clients.js";
import type { TenantTag } from "./entity-handlers/clients.js";
import { validateActions, validateActionModules } from "./entity-handlers/actions.js";
import { validateAttackProtection } from "./entity-handlers/attack_protection.js";
import type { AttackProtectionConfig } from "./entity-handlers/attack_protection.js";
import { validateCustomDomains } from "./entity-handlers/custom_domain.js";
import { validateDatabases } from "./entity-handlers/databases.js";
import { validateEmailTemplates } from "./entity-handlers/email_templates.js";
import { validateEventStreams } from "./entity-handlers/event_streams.js";
import { validateErrorPageTemplate } from "./entity-handlers/error_page_template.js";
import { validateResourceServers } from "./entity-handlers/resource_servers.js";
import { validateTenantSettings } from "./entity-handlers/tenant_settings.js";
import { LEVEL_COLOR, LEVEL_ORDER } from "./levels.js";
import type { Finding, FindingLevel } from "./types.js";

const entityFlagIndex = process.argv.indexOf("--entity");
const entityFlag =
  entityFlagIndex !== -1 ? (process.argv[entityFlagIndex + 1] ?? null) : null;

const tenantTagFlagIndex = process.argv.indexOf("--tenant-tag");
const tenantTagFlag =
  tenantTagFlagIndex !== -1 ? (process.argv[tenantTagFlagIndex + 1] ?? null) : null;

if (
  tenantTagFlag !== null &&
  !(TENANT_TAGS as readonly string[]).includes(tenantTagFlag)
) {
  console.error(
    `Invalid --tenant-tag "${tenantTagFlag}". Valid options: ${TENANT_TAGS.join(", ")}`
  );
  process.exit(1);
}

const tenantTag = tenantTagFlag as TenantTag | undefined;

const { tenantDir } = await selectTenant();

const SUPPORTED_ENTITIES = [
  "clients",
  "actions",
  "action-modules",
  "attack-protection",
  "custom-domains",
  "database-connections",
  "email-templates",
  "event-streams",
  "pages",
  "resource-servers",
  "tenant-settings",
] as const;
type SupportedEntity = (typeof SUPPORTED_ENTITIES)[number];

function getEntityFiles(entity: SupportedEntity): string[] {
  if (entity === "tenant-settings") {
    return existsSync(join(tenantDir, "tenant.json")) ? ["tenant.json"] : [];
  }

  const dir = join(tenantDir, entity);
  if (!existsSync(dir)) return [];

  if (entity === "database-connections") {
    return readdirSync(dir).filter((f) => {
      const subDir = join(dir, f);
      return statSync(subDir).isDirectory() && existsSync(join(subDir, "database.json"));
    });
  }

  if (entity === "pages") {
    return readdirSync(dir).filter((f) => f.endsWith(".html") || f.endsWith(".json"));
  }

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
  selectedEntities =
    selected === "__all__" ? availableEntities : [selected as SupportedEntity];
}

async function loadAndValidate(entity: SupportedEntity): Promise<Finding[]> {
  const files = getEntityFiles(entity);

  if (entity === "clients") {
    const clients = files.map(
      (f) =>
        JSON.parse(readFileSync(join(tenantDir, entity, f), "utf-8")) as Management.Client
    );
    console.log(`Validating ${clients.length} client(s)...`);
    return validateClients(clients, tenantTag);
  }

  if (entity === "actions" || entity === "action-modules") {
    const items = files.map((f) => {
      const item = JSON.parse(readFileSync(join(tenantDir, entity, f), "utf-8"));
      if (typeof item.code === "string" && item.code.startsWith("./")) {
        item.code = readFileSync(join(tenantDir, item.code), "utf-8");
      }
      return item;
    });

    if (entity === "actions") {
      console.log(`Validating ${items.length} action(s)...`);
      return validateActions(items, tenantTag);
    } else {
      console.log(`Validating ${items.length} action module(s)...`);
      return validateActionModules(items, tenantTag);
    }
  }

  if (entity === "attack-protection") {
    const fileKeyMap: Record<string, keyof AttackProtectionConfig> = {
      "breached-password-detection.json": "breachedPasswordDetection",
      "brute-force-protection.json": "bruteForceProtection",
      "suspicious-ip-throttling.json": "suspiciousIpThrottling",
    };
    const config: AttackProtectionConfig = {};
    for (const f of files) {
      const key = fileKeyMap[f];
      if (key) {
        config[key] = JSON.parse(readFileSync(join(tenantDir, entity, f), "utf-8"));
      }
    }
    console.log("Validating attack protection...");
    return validateAttackProtection(config, tenantTag);
  }

  if (entity === "custom-domains") {
    const customDomains = JSON.parse(
      readFileSync(join(tenantDir, entity, "custom-domains.json"), "utf-8")
    ) as unknown[];
    console.log(`Validating ${customDomains.length} custom domain(s)...`);
    return validateCustomDomains(customDomains, tenantTag);
  }

  if (entity === "database-connections") {
    const databases = files.map((f) =>
      JSON.parse(readFileSync(join(tenantDir, entity, f, "database.json"), "utf-8"))
    );
    console.log(`Validating ${databases.length} database connection(s)...`);
    return validateDatabases(databases, tenantTag);
  }

  if (entity === "email-templates") {
    const emailTemplates = files.map((f) =>
      JSON.parse(readFileSync(join(tenantDir, entity, f), "utf-8"))
    );
    console.log(`Validating ${emailTemplates.length} email template(s)...`);
    return validateEmailTemplates(emailTemplates, tenantTag);
  }

  if (entity === "event-streams") {
    const eventStreams = files.map((f) =>
      JSON.parse(readFileSync(join(tenantDir, entity, f), "utf-8"))
    );
    console.log(`Validating ${eventStreams.length} event stream(s)...`);
    return validateEventStreams(eventStreams, tenantTag);
  }

  if (entity === "pages") {
    const htmlFile = files.find((f) => f.endsWith(".html"));
    if (!htmlFile) return [];
    const errorPageTemplate = readFileSync(join(tenantDir, entity, htmlFile), "utf-8");
    console.log("Validating error page template...");
    return validateErrorPageTemplate(errorPageTemplate, tenantTag);
  }

  if (entity === "resource-servers") {
    const resourceServers = files.map((f) =>
      JSON.parse(readFileSync(join(tenantDir, entity, f), "utf-8"))
    );
    console.log(`Validating ${resourceServers.length} resource server(s)...`);
    return validateResourceServers(resourceServers, tenantTag);
  }

  if (entity === "tenant-settings") {
    const tenant = JSON.parse(readFileSync(join(tenantDir, "tenant.json"), "utf-8"));
    console.log("Validating tenant settings...");
    return validateTenantSettings(tenant, tenantTag);
  }

  return [];
}

const findings: Finding[] = (
  await Promise.all(selectedEntities.map(loadAndValidate))
).flat();

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
  console.log(
    color(`[${finding.level.toUpperCase()}] ${finding.clientName} - ${finding.message}`)
  );
}
