import type { Request, Response } from "express";

import { buildAuthorizeUrl } from "./buildAuthorizeUrl.js";
import { readTenantConfig } from "./readTenantConfig.js";

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
  const { connection, extra_params, login_domain } = request.query as Record<string, string>;

  const extraParams: Record<string, string> = {};
  for (const line of (extra_params ?? "").split("\n")) {
    const eqIdx = line.indexOf("=");
    if (eqIdx < 1) continue;
    extraParams[line.slice(0, eqIdx).trim()] = line.slice(eqIdx + 1).trim();
  }

  const loginDomain = login_domain || tenantConfig.loginDomain;

  const { url, state, codeVerifier } = buildAuthorizeUrl(
    client,
    loginDomain,
    response.locals.baseUrl,
    {
      connection: connection || undefined,
      extraParams: Object.keys(extraParams).length > 0 ? extraParams : undefined,
    }
  );

  request.session.oauthState = state;
  request.session.pkceVerifier = codeVerifier;

  response.redirect(url);
}
