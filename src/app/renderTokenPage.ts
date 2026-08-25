import { decodeJwtPayload } from "../utils/jwt.js";
import { pageLayout } from "./pageLayout.js";
import { handleCallback } from "./handleCallback.js";
import { readTenantConfig } from "./readTenantConfig.js";
import type { Request, Response } from "express";

export async function renderTokenPage({
  request,
  response,
  env,
}: {
  request: Request;
  response: Response;
  env: NodeJS.ProcessEnv;
}) {
  const tenantConfig = readTenantConfig(response.locals.tenantDataDir, env);
  const client = response.locals.client!;
  const { tokens, idTokenClaims, rawAccessToken } = await handleCallback({
    query: request.query as Record<string, string>,
    session: request.session,
    clientId: client.client_id,
    baseUrl: response.locals.baseUrl,
    authenticationApi: response.locals.authenticationApi!,
  });

  const accessTokenClaims =
    rawAccessToken && rawAccessToken.split(".").length === 3
      ? decodeJwtPayload(rawAccessToken)
      : null;

  const accessTokenSection = accessTokenClaims
    ? `<h2>Access Token Claims</h2>\n  <pre>${JSON.stringify(accessTokenClaims, null, 2)}</pre>`
    : "";

  response.send(pageLayout({
    title: `Logged in - ${client.name}`,
    tenantConfig,
    styles: `pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; }`,
    body: `
  <h1>Logged in to ${client.name}</h1>
  <p><a href="/">← Back to app list</a></p>
  <h2>ID Token Claims</h2>
  <pre>${JSON.stringify(idTokenClaims, null, 2)}</pre>
  ${accessTokenSection}
  <h2>Token Response</h2>
  <pre>${JSON.stringify(tokens, null, 2)}</pre>`,
  }));
}
