import type { Request, Response } from "express";

import { renderSessionTransferPage } from "./pages/renderSessionTransferPage.js";
import { resolveBaseUrl } from "./updateClientUrls.js";

// The actor's client id lives in the session (set alongside auth0IdToken in
// renderCallbackPage) - targetInitiateLoginUri and clientSecret both follow
// from that id using conventions already used elsewhere (the app's own
// /login route, and the CLIENT_ID_<id>_SECRET env var), so only
// subjectTokenType - tied to a custom Token Exchange Action set up in the
// tenant - is actually project-specific.
export async function handleSessionTransfer({
  request,
  response,
  env,
  subjectTokenType,
}: {
  request: Request;
  response: Response;
  env: NodeJS.ProcessEnv;
  subjectTokenType: string;
}) {
  const clientId = request.session.auth0ClientId;

  return renderSessionTransferPage({
    request,
    response,
    env,
    config: {
      subjectTokenType,
      clientSecret: clientId ? env[`CLIENT_ID_${clientId}_SECRET`] : undefined,
      targetInitiateLoginUri: clientId ? `${resolveBaseUrl(env)}/login/${clientId}` : "",
    },
  });
}
