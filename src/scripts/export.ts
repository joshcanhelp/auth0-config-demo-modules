import process from "node:process";
import { readdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

import { dump } from "auth0-deploy-cli";
import { AssetTypes } from "auth0-deploy-cli/lib/types.js";

import { getClientCredentialsToken } from "../auth0/clientCredentials.js";
import { withRetryOnInsufficientScope } from "../auth0/withRetryOnInsufficientScope.js";
import { createFileCache } from "./utils/fileCache.js";
import { confirmPrompt, selectPrompt } from "./utils/selectPrompt.js";
import { selectTenant } from "./utils/selectTenant.js";

const entityFlagIndex = process.argv.indexOf("--entity");
const entityFlag = entityFlagIndex !== -1 ? (process.argv[entityFlagIndex + 1] ?? null) : null;

const tenantFlagUsed = process.argv.some((a) => a === "--tenant" || a.startsWith("--tenant="));

const { tenantDir: outputdir } = await selectTenant();

const { TENANT_DOMAIN, M2M_CLIENT_ID, M2M_CLIENT_SECRET } = process.env;

if (!TENANT_DOMAIN || !M2M_CLIENT_ID || !M2M_CLIENT_SECRET) {
  console.error("Missing required environment variables. Please check your .env file.");
  process.exit(1);
}

if (tenantFlagUsed) {
  const confirmed = await confirmPrompt(`Export from: ${TENANT_DOMAIN}\nContinue?`);
  if (!confirmed) {
    console.log("Aborted.");
    process.exit(0);
  }
}

function dirToAssetType(dir: string): AssetTypes {
  switch (dir) {
    case "emails":
      return "emailTemplates";
    case "database-connections":
      return "databases";
    case "custom-domains":
      return "customDomains";
    case "resource-servers":
      return "resourceServers";
    case "attack-protection":
      return "attackProtection";
    case "event-streams":
      return "eventStreams";
    case "grants":
      return "clientGrants";
    case "guardian":
      return "guardianFactors";
    case "action-modules":
      return "actionModules";
    default:
      return dir as AssetTypes;
  }
}

const dirOptions = readdirSync(outputdir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "_static")
  .map((entry) => ({ label: entry.name, value: dirToAssetType(entry.name) }));

const allAssets: AssetTypes[] = ["tenant", ...dirOptions.map((o) => o.value)];

let includedOnly: AssetTypes[] | undefined;

if (entityFlag !== null) {
  const validDirNames = new Set(["tenant", ...dirOptions.map((o) => o.label)]);

  if (!validDirNames.has(entityFlag)) {
    console.error(
      `Invalid --entity "${entityFlag}". Valid options: ${[...validDirNames].join(", ")}`
    );
    process.exit(1);
  }

  includedOnly = entityFlag === "tenant" ? ["tenant"] : [dirToAssetType(entityFlag)];
} else {
  const options = [
    { label: "All", value: "__all__" as const },
    { label: "tenant.json", value: "tenant" as AssetTypes },
    ...dirOptions,
  ];

  const selected = await selectPrompt("Select an entity to export:", options);
  includedOnly = selected === "__all__" ? allAssets : [selected as AssetTypes];
}

const cache = createFileCache(`${outputdir}/.management-token.json`);
await withRetryOnInsufficientScope(
  () =>
    getClientCredentialsToken(TENANT_DOMAIN, M2M_CLIENT_ID, M2M_CLIENT_SECRET, {
      cache,
    }),
  () => cache.clear(),
  (token) =>
    dump({
      output_folder: outputdir,
      format: "directory",
      config: {
        AUTH0_DOMAIN: TENANT_DOMAIN,
        AUTH0_EXPORT_IDENTIFIERS: true,
        AUTH0_ACCESS_TOKEN: token,
        ...(includedOnly ? { AUTH0_INCLUDED_ONLY: includedOnly } : {}),
        ...(includedOnly === undefined
          ? {
              AUTH0_EXCLUDED: [
                "guardianFactorProviders",
                "guardianFactorTemplates",
                "guardianPhoneFactorSelectedProvider",
                "hooks",
                "rules",
                "rulesConfigs",
              ],
            }
          : {}),
      },
    })
);

const grantsExported = !includedOnly || includedOnly.includes("clientGrants");
const grantsDir = join(outputdir, "grants");
const clientsDir = join(outputdir, "clients");

if (grantsExported && existsSync(grantsDir) && existsSync(clientsDir)) {
  const localClientIds = new Set(
    readdirSync(clientsDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const content = JSON.parse(readFileSync(join(clientsDir, f), "utf-8")) as Record<
          string,
          unknown
        >;
        return content.client_id as string | undefined;
      })
      .filter((id): id is string => Boolean(id))
  );

  for (const file of readdirSync(grantsDir).filter((f) => f.endsWith(".json"))) {
    const grant = JSON.parse(readFileSync(join(grantsDir, file), "utf-8")) as Record<
      string,
      unknown
    >;
    if (!localClientIds.has(grant.client_id as string)) {
      rmSync(join(grantsDir, file));
      console.log(`[export] Removed grant ${file} - client not in local clients.`);
    }
  }
}
