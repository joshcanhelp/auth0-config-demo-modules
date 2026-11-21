import { strict as assert } from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import type { Command } from "commander";
import {
  loadTenantUserSchema,
  PromptSession,
} from "auth0-config-demo-modules/packages/core/src/index.js";
import { readClients } from "auth0-config-demo-modules/packages/app/src/readClients.js";
import { resolveTenantDirectory } from "../bootstrapTenant.js";
import {
  buildClientsReport,
  CLIENT_REPORT_FORMATS,
  type ClientReportFormat,
} from "../report/reports/clients.js";
import { buildUserSchemaReport } from "../report/reports/userSchema.js";
import { resolveReportPath } from "../report/utils/reportPath.js";

interface ReportClientsOptions {
  tenant?: string;
  format: ClientReportFormat;
}

function reportsDir(): string {
  return resolve(process.cwd(), "reports");
}

function writeReport(path: string, content: string): void {
  mkdirSync(reportsDir(), { recursive: true });
  writeFileSync(path, content, "utf-8");
  console.log(`Report written to ${path}`);
}

async function runClientsReport(
  options: ReportClientsOptions,
  prompts: PromptSession
): Promise<void> {
  assert(
    CLIENT_REPORT_FORMATS.includes(options.format),
    `Invalid --format "${options.format}". Expected ${CLIENT_REPORT_FORMATS.join(" or ")}.`
  );

  const tenantsRoot = join(process.cwd(), "tenants");
  const { tenantName, tenantDir } = await resolveTenantDirectory(
    tenantsRoot,
    prompts,
    options.tenant
  );

  const clients = readClients(tenantDir);
  const content = buildClientsReport(clients, tenantName, options.format);
  const reportPath = resolveReportPath(reportsDir(), "clients", options.format, {
    tenantName,
  });
  writeReport(reportPath, content);
}

async function runUserSchemaReport(): Promise<void> {
  // user-schema.ts lives at the project root, not per-tenant - see loadTenantUserSchema's
  // other call site in packages/app/src/createApp.ts.
  const projectRoot = process.cwd();

  const schema = await loadTenantUserSchema(projectRoot);
  assert(schema, `No user-schema.ts found in ${projectRoot}`);

  const content = buildUserSchemaReport(schema);
  const reportPath = resolveReportPath(reportsDir(), "user-schema", "md");
  writeReport(reportPath, content);
}

export function registerReportCommand(program: Command): void {
  const report = program
    .command("report")
    .description(
      "Generate a report from a tenant's local config - never writes to Auth0."
    );

  report
    .command("clients")
    .description("List client names, descriptions, client IDs, and application types.")
    .option("--tenant <name>", "tenant directory name (skips interactive selection)")
    .option(
      "--format <format>",
      `report format (${CLIENT_REPORT_FORMATS.join("|")})`,
      "md"
    )
    .action(async (options: ReportClientsOptions) => {
      const prompts = new PromptSession();
      try {
        await runClientsReport(options, prompts);
      } finally {
        prompts.close();
      }
    });

  report
    .command("user-schema")
    .description("Document the project's user-schema.ts fields.")
    .action(() => runUserSchemaReport());
}
