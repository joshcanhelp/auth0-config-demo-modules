import process from "node:process";
import { readdirSync } from "node:fs";

import { dump } from "auth0-deploy-cli";
import { AssetTypes } from "auth0-deploy-cli/lib/types.js";

import { getClientCredentialsToken } from "../auth0/clientCredentials.js";
import { withRetryOnInsufficientScope } from "../auth0/withRetryOnInsufficientScope.js";
import { createFileCache } from "./utils/fileCache.js";
import { confirmPrompt, selectPrompt } from "./utils/selectPrompt.js";
import { selectTenant } from "./utils/selectTenant.js";
import { loadDeployConfig } from "./utils/deployConfig.js";
import { DIR_TO_ASSET_TYPE } from "./utils/assetDirectories.js";

const entityFlagIndex = process.argv.indexOf("--entity");
const entityFlag =
  entityFlagIndex !== -1 ? (process.argv[entityFlagIndex + 1] ?? null) : null;

const tenantFlagUsed = process.argv.some(
  (a) => a === "--tenant" || a.startsWith("--tenant=")
);

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
  return DIR_TO_ASSET_TYPE[dir] ?? (dir as AssetTypes);
}

const { skipEntities } = loadDeployConfig(outputdir);
const skipSet = new Set(skipEntities);

const dirOptions = readdirSync(outputdir, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() &&
      !entry.name.startsWith(".") &&
      entry.name !== "_static" &&
      !skipSet.has(entry.name)
  )
  .map((entry) => ({ label: entry.name, value: dirToAssetType(entry.name) }));

const allAssets: AssetTypes[] = [
  ...(skipSet.has("tenant") ? [] : (["tenant"] as AssetTypes[])),
  ...dirOptions.map((o) => o.value),
];

let includedOnly: AssetTypes[] | undefined;

if (entityFlag !== null) {
  if (skipSet.has(entityFlag)) {
    console.error(
      `Entity "${entityFlag}" is configured as skipped in .deploy-config.json.`
    );
    process.exit(1);
  }

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
    { label: "All (local)", value: "__all_local__" as const },
    ...(skipSet.has("tenant")
      ? []
      : [{ label: "tenant.json", value: "tenant" as AssetTypes }]),
    ...dirOptions,
  ];

  const selected = await selectPrompt("Select an entity to export:", options);
  if (selected === "__all__") {
    includedOnly = undefined;
  } else if (selected === "__all_local__") {
    includedOnly = dirOptions.length > 0 ? allAssets : undefined;
  } else {
    includedOnly = [selected as AssetTypes];
  }
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
                ...skipEntities.map((e) =>
                  e === "tenant" ? "tenant" : dirToAssetType(e)
                ),
              ],
            }
          : {}),
      },
    })
);
