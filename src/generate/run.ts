import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { selectTenant } from "../scripts/utils/selectTenant.js";
import { selectPrompt } from "../scripts/utils/selectPrompt.js";
import { handleAction } from "./entity-handlers/actions.js";
import { handleClient } from "./entity-handlers/clients.js";
import { handleGrant } from "./entity-handlers/grants.js";
import { handleSolution } from "./entity-handlers/solutions.js";
import { getTemplateTypes, getTemplatesForType } from "./templateSelection.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// TODO: --templates-path will become required (flag or env) once local templates are removed.
function parseTemplatesPathFlag(): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--templates-path" && args[i + 1]) return args[i + 1];
    const match = args[i].match(/^--templates-path=(.+)$/);
    if (match) return match[1];
  }
  return undefined;
}

const templatesPathFlag = parseTemplatesPathFlag();
const TEMPLATES_DIR = templatesPathFlag
  ? resolve(process.cwd(), templatesPathFlag)
  : join(__dirname, "templates");

if (!existsSync(TEMPLATES_DIR)) {
  console.error(`No templates directory found at: ${TEMPLATES_DIR}`);
  process.exit(1);
}

const { tenantDir } = await selectTenant();

const templateNames = readdirSync(TEMPLATES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
  .map((entry) => entry.name);

if (templateNames.length === 0) {
  console.error("No templates found.");
  process.exit(1);
}

const entityTypes = getTemplateTypes(templateNames).map((type) => ({
  label: type,
  value: type,
}));

const type = await selectPrompt("Select an entity type:", entityTypes);
const templateOptions = getTemplatesForType(templateNames, type);
const selected = await selectPrompt("Select a template:", templateOptions);
const templateDir = join(TEMPLATES_DIR, selected);

if (type === "Action") {
  await handleAction(templateDir, tenantDir);
} else if (type === "Solution") {
  await handleSolution(templateDir, tenantDir, TEMPLATES_DIR);
} else if (type === "Client") {
  await handleClient(templateDir, tenantDir);
} else if (type === "Grant") {
  await handleGrant(templateDir, tenantDir);
} else {
  console.error(`No handler implemented for type: "${type}"`);
  process.exit(1);
}
