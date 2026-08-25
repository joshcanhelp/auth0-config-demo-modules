import process from "node:process";
import { readdirSync } from "node:fs";

import dotenv from "dotenv";

import { confirmPrompt, selectPrompt } from "./selectPrompt.js";

export interface TenantPaths {
  tenantDir: string;
  envFile: string;
  tenantType: "PUSH" | "PULL";
}

const TENANTS_DIR = "./tenants";

function parseTenantFlag(): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tenant" && args[i + 1]) return args[i + 1];
    const match = args[i].match(/^--tenant=(.+)$/);
    if (match) return match[1];
  }
  return undefined;
}

function stripSuffix(dirName: string): string {
  return dirName.replace(/-(?:PUSH|PULL)$/, "");
}

function resolveTenantType(dirName: string): "PUSH" | "PULL" {
  const fromEnv = process.env.TENANT_TYPE;
  if (fromEnv === "PUSH" || fromEnv === "PULL") return fromEnv;
  if (dirName.endsWith("-PULL")) return "PULL";
  return "PUSH";
}

export async function selectTenant(): Promise<TenantPaths> {
  const options = readdirSync(TENANTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => ({ label: entry.name, value: entry.name }));

  if (options.length === 0) {
    console.error(`No tenants found in ${TENANTS_DIR}`);
    process.exit(1);
  }

  const tenantFlag = parseTenantFlag();

  let tenantName: string;

  if (tenantFlag) {
    const match = options.find((o) => stripSuffix(o.value) === tenantFlag);
    if (!match) {
      console.error(`No tenant directory found matching "--tenant ${tenantFlag}"`);
      process.exit(1);
    }
    tenantName = match.value;
  } else {
    tenantName = await selectPrompt("Select a tenant:", options);
  }

  const tenantDir = `${TENANTS_DIR}/${tenantName}`;
  const envFile = `${tenantDir}/.env`;

  dotenv.config({ path: envFile, quiet: true });

  const tenantType = resolveTenantType(tenantName);

  if (!tenantFlag) {
    const domain = process.env.TENANT_DOMAIN;
    const confirmed = await confirmPrompt(
      `Target: ${tenantName} (${domain ?? "no domain configured"})\nContinue?`
    );

    if (!confirmed) {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  return { tenantDir, envFile, tenantType };
}
