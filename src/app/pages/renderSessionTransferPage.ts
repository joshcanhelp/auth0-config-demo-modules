import type { Request, Response } from "express";

import { createAuthenticationApi } from "../../auth0/apiAuthentication.js";
import { buildLogoutUrl } from "./../buildLogoutUrl.js";
import { pageLayout } from "./pageLayout.js";
import { readTenantConfig } from "./../readTenantConfig.js";

export interface SessionTransferConfig {
  clientId: string;
  clientSecret: string;
  subjectTokenType: string;
  targetInitiateLoginUri: string;
  audience?: string;
}

const PAGE_TITLE = "Session Transfer";

export async function renderSessionTransferPage({
  request,
  response,
  env,
  config,
}: {
  request: Request;
  response: Response;
  env: NodeJS.ProcessEnv;
  config: SessionTransferConfig;
}) {
  const tenantConfig = readTenantConfig(response.locals.tenantDataDir, env);
  const renderError = (status: number, message: string) =>
    response.status(status).send(
      pageLayout({
        title: PAGE_TITLE,
        tenantConfig,
        body: `<h1>${PAGE_TITLE}</h1><p>${message}</p>`,
      })
    );

  const subjectToken = request.query.subject_token;
  if (typeof subjectToken !== "string" || subjectToken.length === 0) {
    renderError(400, "Missing subject_token parameter.");
    return;
  }

  const actorToken = request.session.auth0IdToken;
  if (!actorToken) {
    renderError(400, "No actor identity in session - please log in again.");
    return;
  }
  // Single-use: this ID token is only meant to authorize the one exchange.
  request.session.auth0IdToken = undefined;

  const authenticationApi = createAuthenticationApi(
    response.locals.auth0Domain,
    config.clientId,
    config.clientSecret
  );

  let sessionTransferToken: string | undefined;
  try {
    const tokens = await authenticationApi.tokenExchange({
      audience: config.audience ?? `urn:${response.locals.auth0Domain}:session_transfer`,
      subjectTokenType: config.subjectTokenType,
      subjectToken,
      actorTokenType: "urn:ietf:params:oauth:token-type:id_token",
      actorToken,
    });
    sessionTransferToken = tokens.access_token as string | undefined;
  } catch (error) {
    renderError(
      502,
      `Unable to obtain a session transfer token: ${(error as Error).message}`
    );
    return;
  }

  if (!sessionTransferToken) {
    renderError(502, "Unable to obtain a session transfer token.");
    return;
  }

  const targetUrl = new URL(config.targetInitiateLoginUri);
  targetUrl.searchParams.set("session_transfer_token", sessionTransferToken);

  // Redeeming a session transfer token fails with session_conflict while the
  // actor still has an active session, so route through /v2/logout first
  // (clearing that session) with returnTo pointing at the target - no
  // Management API grant needed. See the Security Model section:
  // https://auth0.com/docs/authenticate/single-sign-on/session-delegation/implement-session-delegation
  const continueUrl = buildLogoutUrl({
    loginDomain: tenantConfig.loginDomain,
    clientId: config.clientId,
    returnTo: targetUrl.toString(),
  });

  response.send(
    pageLayout({
      title: PAGE_TITLE,
      tenantConfig,
      body: `
        <h1>${PAGE_TITLE}</h1>
        <p>A new session is ready.</p>
        <a href="${continueUrl}"><button>Continue</button></a>
      `,
    })
  );
}
