import process from "node:process";
import { readdirSync } from "node:fs";

import dotenv from "dotenv";

import { selectPrompt } from "./utils/selectPrompt.js";
import { getClientCredentialsTokenResponse } from "../auth0/clientCredentials.js";

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

const envFile = `${TENANTS_DIR}/${tenantName}/.env`;
dotenv.config({ path: envFile, quiet: true });

const { TENANT_DOMAIN, M2M_CLIENT_ID, M2M_CLIENT_SECRET } = process.env;

if (!TENANT_DOMAIN || !M2M_CLIENT_ID || !M2M_CLIENT_SECRET) {
  console.error("Missing required environment variables. Please check your .env file.");
  process.exit(1);
}

const showScopes = process.argv.includes("--show-scopes");

const data = await getClientCredentialsTokenResponse(TENANT_DOMAIN, M2M_CLIENT_ID, M2M_CLIENT_SECRET);

console.log(data.access_token);

if (showScopes) {
  const scopes = data.scope ? data.scope.split(" ").sort() : [];
  console.log(`\nScopes (${scopes.length}):`);
  for (const scope of scopes) {
    console.log(`  ${scope}`);
  }
}
