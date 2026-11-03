import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";

import { decodeJwtPayload } from "../../utils/jwt.js";
import { handleCallback } from "./../handleCallback.js";
import { detectLoginMethod } from "./../detectLoginMethod.js";
import { pageLayout } from "./pageLayout.js";
import { readTenantConfig } from "./../readTenantConfig.js";

const dir = dirname(fileURLToPath(import.meta.url));

export async function renderCallbackPage({
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

  const pageHeader = `
    <h1>Logging in to ${client.name}</h1>
    <p>
      <a href="/client/${client.client_id}">&larr; Back to ${client.name}</a> &bull;
      <a href="/login/${client.client_id}">Login again &rarr;</a>
    </p>
  `;

  if (detectLoginMethod(client, env) === "frontend") {
    const spaCallbackScript = readFileSync(
      join(dir, "..", "browser", "spaCallback.js"),
      "utf-8"
    );
    const callbackConfig = JSON.stringify({
      auth0Domain: response.locals.auth0Domain,
      clientId: client.client_id,
      redirectUri: `${response.locals.baseUrl}/callback/${client.client_id}`,
    });
    return response.send(
      pageLayout({
        title: `Callback - ${client.name}`,
        tenantConfig,
        body: `
          ${pageHeader}
          <div id="steps"></div>
          <div id="tokens"></div>
          <script id="spa-callback-config" type="application/json">${callbackConfig}</script>
          <script>${spaCallbackScript}</script>
        `,
      })
    );
  }

  const { tokens, idTokenClaims, rawAccessToken } = await handleCallback({
    query: request.query as Record<string, string>,
    session: request.session,
    clientId: client.client_id,
    baseUrl: response.locals.baseUrl,
    authenticationApi: response.locals.authenticationApi!,
  });

  const sub = (idTokenClaims as Record<string, unknown> | null)?.sub;
  if (typeof sub === "string") {
    request.session.auth0UserId = sub;
  }

  const email = (idTokenClaims as Record<string, unknown> | null)?.email;
  if (typeof email === "string") {
    request.session.auth0UserEmail = email;
  }

  request.session.auth0ClientId = client.client_id;

  const accessTokenClaims =
    rawAccessToken && rawAccessToken.split(".").length === 3
      ? decodeJwtPayload(rawAccessToken)
      : null;

  const accessTokenSection = accessTokenClaims
    ? `<h2>Access Token Claims</h2>\n  <pre>${JSON.stringify(accessTokenClaims, null, 2)}</pre>`
    : "";

  response.send(
    pageLayout({
      title: `Logged in - ${client.name}`,
      tenantConfig,
      body: `
        ${pageHeader}
        <h2>ID Token Claims</h2>
        <pre>${JSON.stringify(idTokenClaims, null, 2)}</pre>
        ${accessTokenSection}
        <h2>Token Response</h2>
        <pre>${JSON.stringify(tokens, null, 2)}</pre>
      `,
    })
  );
}
