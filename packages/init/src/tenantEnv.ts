import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isTenantType } from "./tenantType.js";

export interface TenantEnv {
  TENANT_DOMAIN?: string;
  TENANT_TYPE?: string;
  M2M_CLIENT_ID?: string;
  M2M_CLIENT_SECRET?: string;
}

export interface ExistingTenant {
  name: string;
  env: TenantEnv;
}

const ENV_KEYS: (keyof TenantEnv)[] = [
  "TENANT_DOMAIN",
  "TENANT_TYPE",
  "M2M_CLIENT_ID",
  "M2M_CLIENT_SECRET",
];

function stripQuotes(value: string): string {
  const match = /^"(.*)"$/.exec(value.trim());
  return match ? match[1] : value.trim();
}

export function parseEnvValue(lines: string[], key: string): string | undefined {
  const pattern = new RegExp(`^${key}=(.*)$`);
  for (const line of lines) {
    const match = pattern.exec(line);
    if (match) return stripQuotes(match[1]);
  }
  return undefined;
}

// Replaces `key`'s line in place if it's already there, otherwise appends it - so writing one
// value never disturbs any other line already in the file.
export function setEnvValue(lines: string[], key: string, value: string): string[] {
  const serialized = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}=`);
  const index = lines.findIndex((line) => pattern.test(line));
  if (index !== -1) {
    const updated = [...lines];
    updated[index] = serialized;
    return updated;
  }
  return [...lines, serialized];
}

async function readEnvLines(envPath: string): Promise<string[]> {
  let content: string;
  try {
    content = await readFile(envPath, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const lines = content.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

async function writeEnvLines(envPath: string, lines: string[]): Promise<void> {
  await writeFile(envPath, lines.length > 0 ? lines.join("\n") + "\n" : "");
}

export async function readTenantEnv(tenantDir: string): Promise<TenantEnv> {
  const lines = await readEnvLines(join(tenantDir, ".env"));
  const env: TenantEnv = {};
  for (const key of ENV_KEYS) {
    const value = parseEnvValue(lines, key);
    if (value !== undefined) env[key] = value;
  }
  return env;
}

export async function writeTenantEnvValue(
  tenantDir: string,
  key: keyof TenantEnv,
  value: string
): Promise<void> {
  const envPath = join(tenantDir, ".env");
  const lines = await readEnvLines(envPath);
  await writeEnvLines(envPath, setEnvValue(lines, key, value));
}

// A tenant counts as configured once every value `init` currently knows how to collect is
// present. Client id/secret aren't collected yet (see init.ts's TODO for the token/scope check),
// so this only checks tenant type and domain for now - it'll grow alongside that command.
export function isTenantConfigured(env: TenantEnv): boolean {
  return Boolean(env.TENANT_TYPE && isTenantType(env.TENANT_TYPE) && env.TENANT_DOMAIN);
}

export async function listTenantDirectories(
  tenantsRoot: string
): Promise<ExistingTenant[]> {
  let entries;
  try {
    entries = await readdir(tenantsRoot, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const names = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  return Promise.all(
    names.map(async (name) => ({
      name,
      env: await readTenantEnv(join(tenantsRoot, name)),
    }))
  );
}
