import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";

import { buildAuthorizeUrl } from "./buildAuthorizeUrl.js";
import { detectLoginMethod } from "./detectLoginMethod.js";
import { pageLayout } from "./pageLayout.js";
import { readTenantConfig } from "./readTenantConfig.js";

const dir = dirname(fileURLToPath(import.meta.url));

export function handleLoginRedirect({
  request,
  response,
  env,
}: {
  request: Request;
  response: Response;
  env: NodeJS.ProcessEnv;
}) {
  const client = response.locals.client!;
  const tenantConfig = readTenantConfig(response.locals.tenantDataDir, env);
  const { connection, extra_params, login_domain } = request.query as Record<
    string,
    string
  >;

  const extraParams: Record<string, string> = {};
  for (const line of (extra_params ?? "").split("\n")) {
    const eqIdx = line.indexOf("=");
    if (eqIdx < 1) continue;
    extraParams[line.slice(0, eqIdx).trim()] = line.slice(eqIdx + 1).trim();
  }

  const loginDomain = login_domain || tenantConfig.loginDomain;

  const { url, state, codeVerifier, codeChallenge } = buildAuthorizeUrl(
    client,
    loginDomain,
    response.locals.baseUrl,
    {
      connection: connection || undefined,
      extraParams: Object.keys(extraParams).length > 0 ? extraParams : undefined,
    }
  );

  if (detectLoginMethod(client, env) === "frontend") {
    const spaLoginScript = readFileSync(join(dir, "browser", "spaLogin.js"), "utf-8");
    const loginConfig = JSON.stringify({
      domain: loginDomain,
      clientId: client.client_id,
      redirectUri: `${response.locals.baseUrl}/callback/${client.client_id}`,
      state,
      codeVerifier,
      codeChallenge,
      ...(connection ? { connection } : {}),
      ...(Object.keys(extraParams).length > 0 ? { extraParams } : {}),
    });
    return response.send(
      pageLayout({
        title: `Redirecting - ${client.name}`,
        tenantConfig,
        body: `
  <p>Redirecting to login&hellip;</p>
  <script id="spa-login-config" type="application/json">${loginConfig}</script>
  <script>${spaLoginScript}</script>`,
      })
    );
  }

  request.session.oauthState = state;
  request.session.pkceVerifier = codeVerifier;
  response.redirect(url);
}
