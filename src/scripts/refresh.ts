import process from "node:process";
import { readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { dump } from "auth0-deploy-cli";
import type { AssetTypes } from "auth0-deploy-cli/lib/types.js";

import { getClientCredentialsToken } from "../auth0/clientCredentials.js";
import { withRetryOnInsufficientScope } from "../auth0/withRetryOnInsufficientScope.js";
import { createFileCache } from "./utils/fileCache.js";
import { selectPrompt } from "./utils/selectPrompt.js";
import { selectTenant } from "./utils/selectTenant.js";

const { tenantDir } = await selectTenant();

const { TENANT_DOMAIN, M2M_CLIENT_ID, M2M_CLIENT_SECRET } = process.env;

if (!TENANT_DOMAIN || !M2M_CLIENT_ID || !M2M_CLIENT_SECRET) {
  console.error("Missing required environment variables. Please check your .env file.");
  process.exit(1);
}

const DIR_TO_ASSET: Record<string, AssetTypes> = {
  "branding": "branding",
  "clients": "clients",
  "custom-domains": "customDomains",
  "database-connections": "databases",
  "connections": "connections",
  "grants": "clientGrants",
  "prompts": "prompts",
  "themes": "themes",
};

const dirOptions = readdirSync(tenantDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name in DIR_TO_ASSET)
  .map((entry) => ({ label: entry.name, value: DIR_TO_ASSET[entry.name]! }));

const options = [{ label: "All", value: "__all__" as const }, ...dirOptions];

const selected = await selectPrompt("Select an entity type to refresh:", options);

const selectedTypes: AssetTypes[] =
  selected === "__all__" ? dirOptions.map((o) => o.value) : [selected as AssetTypes];

const cache = createFileCache(`${tenantDir}/.management-token.json`);

const tmpDir = mkdtempSync(join(tmpdir(), "aid-refresh-"));

try {
  await withRetryOnInsufficientScope(
    () =>
      getClientCredentialsToken(
        TENANT_DOMAIN!,
        M2M_CLIENT_ID!,
        M2M_CLIENT_SECRET!,
        {
          cache,
        }
      ),
    () => cache.clear(),
    (token) =>
      dump({
        output_folder: tmpDir,
        format: "directory",
        export_ids: true,
        config: {
          AUTH0_DOMAIN: TENANT_DOMAIN!,
          AUTH0_ACCESS_TOKEN: token,
          AUTH0_INCLUDED_ONLY: selectedTypes,
        },
      })
  );

  for (const assetType of selectedTypes) {
    const dirName = Object.keys(DIR_TO_ASSET).find((k) => DIR_TO_ASSET[k] === assetType);
    if (!dirName) continue;

    const localDir = join(tenantDir, dirName);
    const tmpAssetDir = join(tmpDir, dirName);

    if (assetType === "clients") {
      refreshClients(localDir, tmpAssetDir);
    }
  }
} finally {
  rmSync(tmpDir, { recursive: true });
}

function refreshClients(localDir: string, tmpDir: string): void {
  const localFiles = readdirSync(localDir).filter((f) => f.endsWith(".json"));

  // Build a map of client_id -> local filename for existing clients
  const localClientIds = new Map<string, string>();
  for (const file of localFiles) {
    const content = JSON.parse(readFileSync(join(localDir, file), "utf-8")) as Record<
      string,
      unknown
    >;
    if (content.client_id) {
      localClientIds.set(content.client_id as string, file);
    }
  }

  if (localClientIds.size === 0) {
    console.log("[refresh] No existing clients to refresh.");
    return;
  }

  const exportedFiles = readdirSync(tmpDir).filter((f) => f.endsWith(".json"));

  for (const exportedFile of exportedFiles) {
    const exported = JSON.parse(
      readFileSync(join(tmpDir, exportedFile), "utf-8")
    ) as Record<string, unknown>;

    const localFile = localClientIds.get(exported.client_id as string);
    if (!localFile) {
      continue;
    }

    writeFileSync(join(localDir, localFile), readFileSync(join(tmpDir, exportedFile)));
    console.log(`[refresh] Updated client: ${exported.name as string}`);
  }
}
