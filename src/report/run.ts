import { mkdirSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import process from "node:process";

import { readClients } from "../app/readClients.js";
import { selectTenant } from "../scripts/utils/selectTenant.js";
import { loadTenantUserSchema } from "../utils/tenantUserSchema.js";
import {
  buildClientsReport,
  CLIENT_REPORT_FORMATS,
  type ClientReportFormat,
} from "./reports/clients.js";
import { buildUserSchemaReport } from "./reports/userSchema.js";
import { resolveReportPath } from "./utils/reportPath.js";

const REPORTS_DIR = resolve(process.cwd(), "reports");

function parseClientFormatFlag(): ClientReportFormat {
  const index = process.argv.indexOf("--format");
  const value = index !== -1 ? process.argv[index + 1] : undefined;

  if (value === undefined) return "md";

  if (!CLIENT_REPORT_FORMATS.includes(value as ClientReportFormat)) {
    console.error(
      `Invalid --format "${value}". Expected ${CLIENT_REPORT_FORMATS.join(" or ")}.`
    );
    process.exit(1);
  }

  return value as ClientReportFormat;
}

function writeReport(path: string, content: string): void {
  mkdirSync(REPORTS_DIR, { recursive: true });
  writeFileSync(path, content, "utf-8");
  console.log(`Report written to ${path}`);
}

const command = process.argv[2];

if (command === "clients") {
  const format = parseClientFormatFlag();
  const { tenantDir } = await selectTenant();
  const tenantName = basename(tenantDir);

  const clients = readClients(tenantDir);
  const content = buildClientsReport(clients, tenantName, format);
  const reportPath = resolveReportPath(REPORTS_DIR, "clients", format, { tenantName });
  writeReport(reportPath, content);
  process.exit(0);
}

if (command === "user-schema") {
  // user-schema.ts lives at the project root, not per-tenant - see
  // loadTenantUserSchema's call site in src/app/createApp.ts.
  const projectRoot = process.cwd();

  const schema = await loadTenantUserSchema(projectRoot);
  if (!schema) {
    console.error(`No user-schema.ts found in ${projectRoot}`);
    process.exit(1);
  }

  const content = buildUserSchemaReport(schema);
  const reportPath = resolveReportPath(REPORTS_DIR, "user-schema", "md");
  writeReport(reportPath, content);
  process.exit(0);
}

console.error(`Unknown command "${command}". Expected "clients" or "user-schema".`);
process.exit(1);
