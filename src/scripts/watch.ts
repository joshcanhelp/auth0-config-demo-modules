import process from "node:process";
import { watch, statSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { deploy } from "auth0-deploy-cli";
import { AssetTypes } from "auth0-deploy-cli/lib/types.js";

import { getClientCredentialsToken } from "../auth0/clientCredentials.js";
import { withRetryOnInsufficientScope } from "../auth0/withRetryOnInsufficientScope.js";
import { buildPromptPartials } from "../deploy/buildPromptPartials.js";
import { buildTriggers } from "../deploy/buildTriggers.js";
import { createFileCache } from "./utils/fileCache.js";
import { selectTenant } from "./utils/selectTenant.js";

const { tenantDir: TENANT_DIR, tenantType } = await selectTenant();

if (tenantType === "PULL") {
  console.error("This tenant is read-only (PULL). Watch/deploy is not allowed.");
  process.exit(1);
}

const { TENANT_DOMAIN, M2M_CLIENT_ID, M2M_CLIENT_SECRET } = process.env;

if (!TENANT_DOMAIN || !M2M_CLIENT_ID || !M2M_CLIENT_SECRET) {
  console.error("Missing required environment variables. Please check your .env file.");
  process.exit(1);
}

const DEBOUNCE_MS = 500;

// Maps top-level tenant directory names to Deploy CLI asset types.
// "tenant" is used for tenant.json which has no subdirectory.
const DIR_TO_ASSET: Record<string, string> = {
  "actions": "actions",
  "branding": "branding",
  "clients": "clients",
  "connections": "connections",
  "custom-domains": "customDomains",
  "database-connections": "databases",
  "grants": "clientGrants",
  "event-streams": "eventStreams",
  "forms": "forms",
  "flows": "flows",
  "flow-vault-connections": "flowVaultConnections",
  "prompts": "prompts",
  "themes": "themes",
  "tenant": "tenant",
  "emails": "emailTemplates",
  "triggers": "triggers",
};

function assetTypeFromPath(relativePath: string): string | null {
  const topLevel = relativePath.split(/[\\/]/)[0];
  // tenant.json sits at the root — its "topLevel" is the filename itself
  if (topLevel === "tenant.json") {
    return DIR_TO_ASSET["tenant"] ?? null;
  }
  return DIR_TO_ASSET[topLevel] ?? null;
}

const pendingDeploys = new Map<string, ReturnType<typeof setTimeout>>();

function hasUnimportedClients(): boolean {
  const clientsDir = join(TENANT_DIR, "clients");
  return readdirSync(clientsDir)
    .filter((f) => f.endsWith(".json"))
    .some((f) => {
      const content = JSON.parse(readFileSync(join(clientsDir, f), "utf-8")) as Record<
        string,
        unknown
      >;
      return !content.client_id;
    });
}

function hasUnimportedActions(): boolean {
  const actionsDir = join(TENANT_DIR, "actions");
  return readdirSync(actionsDir)
    .filter((f) => f.endsWith(".json"))
    .some((f) => {
      const content = JSON.parse(readFileSync(join(actionsDir, f), "utf-8")) as Record<
        string,
        unknown
      >;
      return !content.id;
    });
}

async function deployAsset(assetType: string): Promise<void> {
  if (assetType === "clients" && hasUnimportedClients()) {
    console.log(
      "[watch] Skipping clients deploy - unimported clients found. Run npm run import first."
    );
    return;
  }

  if (assetType === "actions" && hasUnimportedActions()) {
    console.log(
      "[watch] Skipping actions deploy - unimported actions found. Run npm run import first."
    );
    return;
  }

  if (assetType === "prompts") {
    const changed = buildPromptPartials(TENANT_DIR);
    if (changed) {
      console.log(`[watch] Rebuilt partials.json`);
    }
  }

  if (assetType === "actions") {
    const changed = buildTriggers(TENANT_DIR);
    if (changed) {
      console.log(`[watch] Rebuilt triggers.json`);
      scheduleDeploy("triggers");
    }
  }

  console.log(`[watch] Deploying ${assetType}...`);

  try {
    const cache = createFileCache(`${TENANT_DIR}/.management-token.json`);
    await withRetryOnInsufficientScope(
      () =>
        getClientCredentialsToken(TENANT_DOMAIN!, M2M_CLIENT_ID!, M2M_CLIENT_SECRET!, {
          cache,
        }),
      () => cache.clear(),
      (token) =>
        deploy({
          input_file: TENANT_DIR,
          config: {
            AUTH0_DOMAIN: TENANT_DOMAIN!,
            AUTH0_ACCESS_TOKEN: token,
            AUTH0_INCLUDED_ONLY: [assetType as AssetTypes],
            AUTH0_KEYWORD_REPLACE_MAPPINGS: {
              TENANT_DOMAIN: TENANT_DOMAIN!,
              ACTIONS_CONNECTOR_CLIENT_ID: process.env.ACTIONS_CONNECTOR_CLIENT_ID!,
              ACTIONS_CONNECTOR_CLIENT_SECRET:
                process.env.ACTIONS_CONNECTOR_CLIENT_SECRET!,
              AUTH0_M2M_CLIENT_ID: process.env.M2M_CLIENT_ID!,
              AUTH0_M2M_CLIENT_SECRET: process.env.M2M_CLIENT_SECRET!,
            },
          },
        })
    );

    console.log(`[watch] Deployed ${assetType}`);
  } catch (err) {
    console.error(`[watch] Deploy failed for ${assetType}:`, err);
  }
}

function scheduleDeploy(assetType: string): void {
  const existing = pendingDeploys.get(assetType);
  if (existing) {
    clearTimeout(existing);
  }

  pendingDeploys.set(
    assetType,
    setTimeout(() => {
      pendingDeploys.delete(assetType);
      void deployAsset(assetType);
    }, DEBOUNCE_MS)
  );
}

// Files generated by pre-deploy build steps should not re-trigger deploys.
const GENERATED_FILES = new Set(["prompts/partials.json", "triggers/triggers.json"]);

watch(TENANT_DIR, { recursive: true }, (_event, filename) => {
  if (!filename) {
    return;
  }

  if (GENERATED_FILES.has(filename.replace(/\\/g, "/"))) {
    return;
  }

  try {
    if (statSync(join(TENANT_DIR, filename)).isDirectory()) {
      return;
    }
  } catch {
    // File was deleted - proceed with deploy
  }

  const assetType = assetTypeFromPath(filename);
  if (!assetType) {
    console.log(`[watch] No asset mapping for: ${filename}`);
    return;
  }

  console.log(`[watch] Change detected: ${filename} → ${assetType}`);
  scheduleDeploy(assetType);
});

console.log(`[watch] Watching ${TENANT_DIR} for changes...`);
