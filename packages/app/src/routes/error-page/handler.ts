import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";

import { renderLiquidFile } from "../../liquidEngine.js";
import { pageLayout } from "../../pageLayout.js";
import { readTenantConfig } from "../../readTenantConfig.js";

const dir = dirname(fileURLToPath(import.meta.url));

// https://auth0.com/docs/customize/login-pages/custom-error-pages
export async function handleErrorPage({
  request,
  response,
  env,
}: {
  request: Request;
  response: Response;
  env: NodeJS.ProcessEnv;
}) {
  const tenantConfig = readTenantConfig(response.locals.tenantDataDir, env);
  const { error, error_description, tracking, client_id, connection, lang } =
    request.query as Record<string, string | undefined>;

  const rows = [
    ["Error", error],
    ["Description", error_description],
    ["Tracking ID", tracking],
    ["Client ID", client_id],
    ["Connection", connection],
    ["Language", lang],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => ({ label, value }));

  const body = await renderLiquidFile(join(dir, "render.liquid"), { rows });

  return response.status(400).send(
    pageLayout({
      title: `Error - ${tenantConfig.friendlyName}`,
      tenantConfig,
      body,
    })
  );
}
