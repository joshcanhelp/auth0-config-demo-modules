import process from "node:process";
import { readdirSync } from "node:fs";

import dotenv from "dotenv";

import { confirmPrompt, selectPrompt } from "./selectPrompt.js";

export interface TenantPaths {
  tenantDir: string;
  envFile: string;
  tenantType: "PUSH" | "PULL";
}

export interface TenantPathsWithOptionalType {
  tenantDir: string;
  envFile: string;
  tenantType: "PUSH" | "PULL" | undefined;
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

function resolveTenantType(required: true): "PUSH" | "PULL";
function resolveTenantType(required: false): "PUSH" | "PULL" | undefined;
function resolveTenantType(required: boolean): "PUSH" | "PULL" | undefined {
  const value = process.env.TENANT_TYPE;
  if (value === "PUSH" || value === "PULL") {
    return value;
  }
  if (!required && value === undefined) {
    return undefined;
  }
  console.error(
    `Missing or invalid TENANT_TYPE in .env (expected "PUSH" or "PULL", got ${JSON.stringify(value)}).`
  );
  process.exit(1);
}

export async function selectTenant(options?: {
  requireTenantType?: true;
}): Promise<TenantPaths>;
export async function selectTenant(options: {
  requireTenantType: false;
}): Promise<TenantPathsWithOptionalType>;
export async function selectTenant(
  options: { requireTenantType?: boolean } = {}
): Promise<TenantPaths | TenantPathsWithOptionalType> {
  const requireTenantType = options.requireTenantType ?? true;
  const tenantOptions = readdirSync(TENANTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => ({ label: entry.name, value: entry.name }));

  if (tenantOptions.length === 0) {
    console.error(`No tenants found in ${TENANTS_DIR}`);
    process.exit(1);
  }

  const tenantFlag = parseTenantFlag();

  let tenantName: string;

  if (tenantOptions.length === 1 && !tenantFlag) {
    tenantName = tenantOptions[0].value;
  } else if (tenantFlag) {
    const match = tenantOptions.find((o) => o.value === tenantFlag);
    if (!match) {
      console.error(`No tenant directory found matching "--tenant ${tenantFlag}"`);
      process.exit(1);
    }
    tenantName = match.value;
  } else {
    tenantName = await selectPrompt("Select a tenant:", tenantOptions);
  }

  const tenantDir = `${TENANTS_DIR}/${tenantName}`;
  const envFile = `${tenantDir}/.env`;

  dotenv.config({ path: envFile, quiet: true });

  const tenantType = requireTenantType
    ? resolveTenantType(true)
    : resolveTenantType(false);

  if (!tenantFlag && tenantOptions.length > 1) {
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
