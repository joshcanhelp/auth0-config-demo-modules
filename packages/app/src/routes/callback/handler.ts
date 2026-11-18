import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";

import { decodeJwtPayload } from "auth0-config-demo-modules/packages/core/src/index.js";
import { handleCallback } from "./handleCallback.js";
import { detectLoginMethod } from "../../detectLoginMethod.js";
import { renderLiquidFile } from "../../liquidEngine.js";
import { pageLayout } from "../../pageLayout.js";
import { readTenantConfig } from "../../readTenantConfig.js";

const dir = dirname(fileURLToPath(import.meta.url));

// If a project's tenant issues an ID token claim carrying a session-delegation subject token
// (e.g. an admin choosing to act as another user), naming that claim here shows a "Continue
// session delegation" link to /session-transfer - without the project needing to write any
// callback-page code of its own. Backend login flow only - session delegation calls
// /session-transfer to exchange the subject token server-side, which an SPA client can't do.
function buildSessionDelegationUrl(
  idTokenClaims: unknown,
  claimName: string | undefined
): string | null {
  if (!claimName) return null;
  const subjectToken = (idTokenClaims as Record<string, unknown> | null)?.[claimName];
  if (typeof subjectToken !== "string") return null;
  return `/session-transfer?${new URLSearchParams({ subject_token: subjectToken })}`;
}

export async function renderCallbackPage({
  request,
  response,
  env,
  sessionDelegationIdTokenClaim,
}: {
  request: Request;
  response: Response;
  env: NodeJS.ProcessEnv;
  sessionDelegationIdTokenClaim?: string;
}) {
  const tenantConfig = readTenantConfig(response.locals.tenantDataDir, env);
  const client = response.locals.client!;
  const pageData = { clientName: client.name, clientId: client.client_id };

  const loginMethod = detectLoginMethod(client, env);
  assert(
    !(sessionDelegationIdTokenClaim && loginMethod === "frontend"),
    "sessionDelegationIdTokenClaim is not supported for a frontend (SPA) login method - " +
      "session delegation exchanges the subject token server-side via /session-transfer, " +
      "which requires a confidential backend client."
  );

  if (loginMethod === "frontend") {
    const spaCallbackScript = readFileSync(
      join(dir, "..", "..", "browser", "spaCallback.js"),
      "utf-8"
    );
    const callbackConfigJson = JSON.stringify({
      auth0Domain: response.locals.auth0Domain,
      clientId: client.client_id,
      redirectUri: `${response.locals.baseUrl}/callback/${client.client_id}`,
    });
    const body = await renderLiquidFile(join(dir, "render.liquid"), {
      ...pageData,
      state: "frontend",
      callbackConfigJson,
      spaCallbackScript,
    });
    return response.send(
      pageLayout({ title: `Callback - ${client.name}`, tenantConfig, body })
    );
  }

  let callbackResult;
  try {
    callbackResult = await handleCallback({
      query: request.query as Record<string, string>,
      session: request.session,
      clientId: client.client_id,
      baseUrl: response.locals.baseUrl,
      authenticationApi: response.locals.authenticationApi!,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const body = await renderLiquidFile(join(dir, "render.liquid"), {
      ...pageData,
      state: "error",
      errorMessage: message,
    });
    response
      .status(400)
      .send(pageLayout({ title: `Callback error - ${client.name}`, tenantConfig, body }));
    return;
  }
  const { tokens, idTokenClaims, rawAccessToken } = callbackResult;

  const sub = (idTokenClaims as Record<string, unknown> | null)?.sub;
  if (typeof sub === "string") {
    request.session.auth0UserId = sub;
  }

  const email = (idTokenClaims as Record<string, unknown> | null)?.email;
  if (typeof email === "string") {
    request.session.auth0UserEmail = email;
  }

  request.session.auth0ClientId = client.client_id;

  const idToken = tokens.id_token;
  if (typeof idToken === "string") {
    request.session.auth0IdToken = idToken;
  }

  const accessTokenClaims =
    rawAccessToken && rawAccessToken.split(".").length === 3
      ? decodeJwtPayload(rawAccessToken)
      : null;

  const body = await renderLiquidFile(join(dir, "render.liquid"), {
    ...pageData,
    state: "success",
    sessionDelegationUrl: buildSessionDelegationUrl(
      idTokenClaims,
      sessionDelegationIdTokenClaim
    ),
    idTokenClaimsJson: JSON.stringify(idTokenClaims, null, 2),
    accessTokenClaimsJson: accessTokenClaims
      ? JSON.stringify(accessTokenClaims, null, 2)
      : null,
    tokensJson: JSON.stringify(tokens, null, 2),
  });

  response.send(pageLayout({ title: `Logged in - ${client.name}`, tenantConfig, body }));
}
