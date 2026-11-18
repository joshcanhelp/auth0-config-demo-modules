import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";

import { buildLogoutUrl } from "../../buildLogoutUrl.js";
import { renderLiquidFile } from "../../liquidEngine.js";
import { pageLayout } from "../../pageLayout.js";
import { readTenantConfig } from "../../readTenantConfig.js";

const dir = dirname(fileURLToPath(import.meta.url));

export async function handleLogout({
  request,
  response,
  env,
}: {
  request: Request;
  response: Response;
  env: NodeJS.ProcessEnv;
}) {
  const tenantConfig = readTenantConfig(response.locals.tenantDataDir, env);
  const loginDomain = request.session.loginDomain ?? tenantConfig.loginDomain;
  const clientId = request.session.auth0ClientId;

  await new Promise<void>((resolve) => request.session.destroy(() => resolve()));

  const auth0LogoutUrl = buildLogoutUrl({
    loginDomain,
    clientId,
    returnTo: response.locals.baseUrl,
  });
  const logoutScript = readFileSync(
    join(dir, "..", "..", "browser", "logout.js"),
    "utf-8"
  );
  const logoutConfigJson = JSON.stringify({ auth0LogoutUrl });

  const body = await renderLiquidFile(join(dir, "render.liquid"), {
    logoutConfigJson,
    logoutScript,
  });

  response.send(pageLayout({ title: "Logging out", tenantConfig, body }));
}
