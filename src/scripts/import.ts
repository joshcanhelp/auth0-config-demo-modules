import process from "node:process";
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { deploy, dump } from "auth0-deploy-cli";
import type { AssetTypes } from "auth0-deploy-cli/lib/types.js";

import { getClientCredentialsToken } from "../auth0/clientCredentials.js";
import { withRetryOnInsufficientScope } from "../auth0/withRetryOnInsufficientScope.js";
import { createFileCache } from "./utils/fileCache.js";
import { selectPrompt } from "./utils/selectPrompt.js";
import { buildAppUrls } from "../app/updateClientUrls.js";
import type { AppUrls } from "../app/updateClientUrls.js";
import { selectTenant } from "./utils/selectTenant.js";

const entityFlagIndex = process.argv.indexOf("--entity");
const entityFlag =
  entityFlagIndex !== -1 ? (process.argv[entityFlagIndex + 1] ?? null) : null;

const { tenantDir, tenantType } = await selectTenant();

if (tenantType === "PULL") {
  console.error("This tenant is read-only (PULL). Import is not allowed.");
  process.exit(1);
}

const { TENANT_DOMAIN, M2M_CLIENT_ID, M2M_CLIENT_SECRET, PORT, DEPLOYED_APP_URL } =
  process.env;

if (!TENANT_DOMAIN || !M2M_CLIENT_ID || !M2M_CLIENT_SECRET) {
  console.error("Missing required environment variables. Please check your .env file.");
  process.exit(1);
}

if (!PORT) {
  console.error("PORT is required to generate callback URLs.");
  process.exit(1);
}

const DIR_TO_ASSET: Record<string, AssetTypes> = {
  "actions": "actions",
  "branding": "branding",
  "clients": "clients",
  "connections": "connections",
  "custom-domains": "customDomains",
  "database-connections": "databases",
  "event-streams": "eventStreams",
  "grants": "clientGrants",
  "prompts": "prompts",
  "themes": "themes",
};

const dirOptions = readdirSync(tenantDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name in DIR_TO_ASSET)
  .map((entry) => ({ label: entry.name, value: DIR_TO_ASSET[entry.name]! }));

const options = [
  { label: "All", value: "__all__" as const },
  { label: "tenant.json", value: "tenant" as AssetTypes },
  ...dirOptions,
];

let selected: string;

if (entityFlag !== null) {
  const validDirs = new Set([...Object.keys(DIR_TO_ASSET), "tenant"]);

  if (!validDirs.has(entityFlag)) {
    console.error(
      `Invalid --entity "${entityFlag}". Valid options: ${[...validDirs].join(", ")}`
    );
    process.exit(1);
  }

  if (entityFlag !== "tenant" && !existsSync(join(tenantDir, entityFlag))) {
    console.error(`Entity directory not found in tenant: ${join(tenantDir, entityFlag)}`);
    process.exit(1);
  }

  selected = entityFlag === "tenant" ? "tenant" : DIR_TO_ASSET[entityFlag]!;
} else {
  selected = await selectPrompt("Select an entity type to import:", options);
}

const allAssets: AssetTypes[] = ["tenant", ...dirOptions.map((o) => o.value)];
const selectedTypes: AssetTypes[] =
  selected === "__all__" ? allAssets : [selected as AssetTypes];

const cache = createFileCache(`${tenantDir}/.management-token.json`);

function withToken(fn: (token: string) => Promise<void>): Promise<void> {
  return withRetryOnInsufficientScope(
    () =>
      getClientCredentialsToken(TENANT_DOMAIN!, M2M_CLIENT_ID!, M2M_CLIENT_SECRET!, {
        cache,
      }),
    () => cache.clear(),
    fn
  );
}

function addIfMissing(list: string[], value: string): string[] {
  if (list.includes(value)) return list;
  return [...list, value];
}

function applyUrls(
  client: Record<string, unknown>,
  urls: AppUrls
): Record<string, unknown> {
  return {
    ...client,
    callbacks: addIfMissing((client.callbacks as string[]) ?? [], urls.callbackUrl),
    allowed_logout_urls: addIfMissing(
      (client.allowed_logout_urls as string[]) ?? [],
      urls.logoutUrl
    ),
    ...(client.app_type !== "regular_web" && {
      allowed_origins: addIfMissing(
        (client.allowed_origins as string[]) ?? [],
        urls.origin
      ),
    }),
  };
}

async function importActions(): Promise<void> {
  const actionsDir = join(tenantDir, "actions");
  const localFiles = readdirSync(actionsDir).filter((f) => f.endsWith(".json"));

  const newActionNames = new Set(
    localFiles
      .map(
        (f) =>
          JSON.parse(readFileSync(join(actionsDir, f), "utf-8")) as Record<
            string,
            unknown
          >
      )
      .filter((a) => !a.id)
      .map((a) => a.name as string)
  );

  if (newActionNames.size === 0) {
    return;
  }

  await withToken((token) =>
    deploy({
      input_file: tenantDir,
      config: {
        AUTH0_DOMAIN: TENANT_DOMAIN!,
        AUTH0_ACCESS_TOKEN: token,
        AUTH0_INCLUDED_ONLY: ["actions"],
      },
    })
  );

  const tmpDir = mkdtempSync(join(tmpdir(), "aid-import-"));

  try {
    await withToken((token) =>
      dump({
        output_folder: tmpDir,
        format: "directory",
        export_ids: true,
        config: {
          AUTH0_DOMAIN: TENANT_DOMAIN!,
          AUTH0_ACCESS_TOKEN: token,
          AUTH0_INCLUDED_ONLY: ["actions"],
        },
      })
    );

    const tmpActionsDir = join(tmpDir, "actions");
    const exportedFiles = readdirSync(tmpActionsDir).filter((f) => f.endsWith(".json"));

    for (const exportedFile of exportedFiles) {
      const exported = JSON.parse(
        readFileSync(join(tmpActionsDir, exportedFile), "utf-8")
      ) as Record<string, unknown>;

      if (!newActionNames.has(exported.name as string)) {
        continue;
      }

      const actionId = exported.id as string;
      const localFile = localFiles.find((f) => {
        const content = JSON.parse(readFileSync(join(actionsDir, f), "utf-8")) as Record<
          string,
          unknown
        >;
        return content.name === exported.name;
      });

      if (!localFile) continue;

      const localAction = JSON.parse(
        readFileSync(join(actionsDir, localFile), "utf-8")
      ) as Record<string, unknown>;

      writeFileSync(
        join(actionsDir, localFile),
        JSON.stringify({ id: actionId, ...localAction }, null, 2) + "\n"
      );
      console.log(`[import] Created action: ${exported.name as string} (${actionId})`);
    }
  } finally {
    rmSync(tmpDir, { recursive: true });
  }
}

async function importClients(): Promise<void> {
  const clientsDir = join(tenantDir, "clients");
  const localFiles = readdirSync(clientsDir).filter((f) => f.endsWith(".json"));

  const newClientNames = new Set(
    localFiles
      .map(
        (f) =>
          JSON.parse(readFileSync(join(clientsDir, f), "utf-8")) as Record<
            string,
            unknown
          >
      )
      .filter((c) => !c.client_id)
      .map((c) => c.name as string)
  );

  if (newClientNames.size === 0) {
    return;
  }

  await withToken((token) =>
    deploy({
      input_file: tenantDir,
      config: {
        AUTH0_DOMAIN: TENANT_DOMAIN!,
        AUTH0_ACCESS_TOKEN: token,
        AUTH0_INCLUDED_ONLY: ["clients"],
      },
    })
  );

  const tmpDir = mkdtempSync(join(tmpdir(), "aid-import-"));

  try {
    await withToken((token) =>
      dump({
        output_folder: tmpDir,
        format: "directory",
        export_ids: true,
        config: {
          AUTH0_DOMAIN: TENANT_DOMAIN!,
          AUTH0_ACCESS_TOKEN: token,
          AUTH0_INCLUDED_ONLY: ["clients"],
        },
      })
    );

    const tmpClientsDir = join(tmpDir, "clients");
    const exportedFiles = readdirSync(tmpClientsDir).filter((f) => f.endsWith(".json"));

    for (const exportedFile of exportedFiles) {
      const exported = JSON.parse(
        readFileSync(join(tmpClientsDir, exportedFile), "utf-8")
      ) as Record<string, unknown>;

      if (!newClientNames.has(exported.name as string)) {
        continue;
      }

      const clientId = exported.client_id as string;

      // Find and remove the local file for this client (may have a different filename)
      const localFile = localFiles.find((f) => {
        const content = JSON.parse(readFileSync(join(clientsDir, f), "utf-8")) as Record<
          string,
          unknown
        >;
        return content.name === exported.name;
      });

      if (localFile && localFile !== exportedFile) {
        rmSync(join(clientsDir, localFile));
      }

      // Copy the exported file (with client_id) to the local clients directory
      writeFileSync(
        join(clientsDir, exportedFile),
        readFileSync(join(tmpClientsDir, exportedFile))
      );

      let client = JSON.parse(
        readFileSync(join(clientsDir, exportedFile), "utf-8")
      ) as Record<string, unknown>;

      client = applyUrls(client, buildAppUrls(`http://localhost:${PORT}`, clientId));

      if (DEPLOYED_APP_URL) {
        client = applyUrls(
          client,
          buildAppUrls(DEPLOYED_APP_URL.replace(/\/$/, ""), clientId)
        );
      }

      writeFileSync(
        join(clientsDir, exportedFile),
        JSON.stringify(client, null, 2) + "\n"
      );
      console.log(`[import] Created client: ${exported.name as string} (${clientId})`);
    }
  } finally {
    rmSync(tmpDir, { recursive: true });
  }

  await withToken((token) =>
    deploy({
      input_file: tenantDir,
      config: {
        AUTH0_DOMAIN: TENANT_DOMAIN!,
        AUTH0_ACCESS_TOKEN: token,
        AUTH0_INCLUDED_ONLY: ["clients"],
      },
    })
  );
}

const specialTypes = new Set(["actions", "clients"]);

if (selectedTypes.includes("actions")) {
  await importActions();
}

if (selectedTypes.includes("clients")) {
  await importClients();
}

const remainingTypes = selectedTypes.filter((t) => !specialTypes.has(t));
if (remainingTypes.length > 0) {
  await withToken((token) =>
    deploy({
      input_file: tenantDir,
      config: {
        AUTH0_DOMAIN: TENANT_DOMAIN!,
        AUTH0_ACCESS_TOKEN: token,
        AUTH0_INCLUDED_ONLY: remainingTypes,
      },
    })
  );
}
