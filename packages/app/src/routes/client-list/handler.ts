import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Response } from "express";

import { detectLoginMethod } from "../../detectLoginMethod.js";
import { renderLiquidFile } from "../../liquidEngine.js";
import { pageLayout } from "../../pageLayout.js";
import type { Auth0Client } from "../../types.js";
import { readClients } from "../../readClients.js";
import { readTenantConfig } from "../../readTenantConfig.js";

const dir = dirname(fileURLToPath(import.meta.url));

export async function renderClientListPage({
  response: res,
  env,
}: {
  response: Response;
  env: NodeJS.ProcessEnv;
}) {
  const tenantConfig = readTenantConfig(res.locals.tenantDataDir, env);
  const clients: Auth0Client[] = readClients(res.locals.tenantDataDir);
  const clientRows = clients
    .filter((client) => client.client_metadata?.hide_from_demo !== "true")
    .map((client) => {
      const isM2M = client.app_type === "non_interactive";
      return {
        clientId: client.client_id,
        name: client.name,
        logoUri: client.logo_uri,
        appType: client.app_type,
        grantTypes: client.grant_types,
        loginMethod: isM2M ? null : detectLoginMethod(client, env),
        isM2M,
      };
    });

  const body = await renderLiquidFile(join(dir, "render.liquid"), {
    friendlyName: tenantConfig.friendlyName,
    clients: clientRows,
  });

  res.send(
    pageLayout({
      title: `${tenantConfig.friendlyName} - Demo`,
      tenantConfig,
      body,
    })
  );
}
