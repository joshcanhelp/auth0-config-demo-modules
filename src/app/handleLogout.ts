import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";

import { buildLogoutUrl } from "./buildLogoutUrl.js";
import { pageLayout } from "./pageLayout.js";
import { readTenantConfig } from "./readTenantConfig.js";

const dir = dirname(fileURLToPath(import.meta.url));

export function handleLogout({
  request,
  response,
  env,
}: {
  request: Request;
  response: Response;
  env: NodeJS.ProcessEnv;
}) {
  const tenantConfig = readTenantConfig(response.locals.tenantDataDir, env);

  request.session.destroy(() => {
    const auth0LogoutUrl = buildLogoutUrl({
      loginDomain: tenantConfig.loginDomain,
      returnTo: response.locals.baseUrl,
    });

    const logoutScript = readFileSync(join(dir, "browser", "logout.js"), "utf-8");
    const logoutConfig = JSON.stringify({ auth0LogoutUrl });

    response.send(
      pageLayout({
        title: "Logging out",
        tenantConfig,
        body: `
  <p>Logging out&hellip;</p>
  <script id="logout-config" type="application/json">${logoutConfig}</script>
  <script>${logoutScript}</script>`,
      })
    );
  });
}
