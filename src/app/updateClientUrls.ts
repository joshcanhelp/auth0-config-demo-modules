import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { Auth0Client } from "../types.js";

export interface AppUrls {
  callbackUrl: string;
  logoutUrl: string;
  origin: string;
}

export function buildAppUrls(baseUrl: string, clientId: string): AppUrls {
  return {
    callbackUrl: `${baseUrl}/callback/${clientId}`,
    logoutUrl: `${baseUrl}`,
    origin: baseUrl,
  };
}

export function resolveBaseUrl(env: NodeJS.ProcessEnv): string {
  if (env.DEPLOYED_APP_URL) {
    return env.DEPLOYED_APP_URL.replace(/\/$/, "");
  }

  const port = env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

export function updateAllClientUrls(tenantDir: string, baseUrl: string): boolean {
  const clientsDir = join(tenantDir, "clients");
  const files = readdirSync(clientsDir).filter((f) => f.endsWith(".json"));
  let changed = false;

  for (const file of files) {
    const filePath = join(clientsDir, file);
    const original = readFileSync(filePath, "utf-8");
    const client = JSON.parse(original) as Auth0Client;

    if (client.app_type === "non_interactive") {
      continue;
    }

    const appUrls = buildAppUrls(baseUrl, client.client_id);
    const updated = ensureUrls(client, appUrls);
    const updatedJson = JSON.stringify(updated, null, 2) + "\n";

    if (updatedJson !== original) {
      writeFileSync(filePath, updatedJson);
      changed = true;
    }
  }

  return changed;
}

function ensureUrls(client: Auth0Client, appUrls: AppUrls): Auth0Client {
  return {
    ...client,
    callbacks: addIfMissing(client.callbacks || [], appUrls.callbackUrl),
    allowed_logout_urls: addIfMissing(
      client.allowed_logout_urls || [],
      appUrls.logoutUrl
    ),
    allowed_origins: addIfMissing(client.allowed_origins || [], appUrls.origin),
  };
}

function addIfMissing(list: string[], value: string): string[] {
  if (list.includes(value)) {
    return list;
  }
  return [...list, value];
}
