import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { selectTenant } from "../scripts/utils/selectTenant.js";
import { selectPrompt } from "../scripts/utils/selectPrompt.js";
import { handleClient } from "./entity-handlers/clients.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "templates");

const { tenantDir } = await selectTenant();

const templates = readdirSync(TEMPLATES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
  .map((entry) => ({ label: entry.name, value: entry.name }));

if (templates.length === 0) {
  console.error("No templates found.");
  process.exit(1);
}

const selected = await selectPrompt("Select a template:", templates);
const [type] = selected.split(" > ");
const templateDir = join(TEMPLATES_DIR, selected);

if (type === "Client") {
  await handleClient(templateDir, tenantDir);
} else {
  console.error(`No handler implemented for type: "${type}"`);
  process.exit(1);
}
