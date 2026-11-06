import type { Request, Response } from "express";

import { decodeJwtPayload } from "../utils/jwt.js";

// A frontend (SPA) login never sends its tokens to the server, but
// server-side features sometimes need the raw ID token afterward (e.g. as the
// actor_token in a later Custom Token Exchange request) - this lets the
// browser report it back into the session once it has one.
export function handleStoreIdToken({
  request,
  response,
}: {
  request: Request;
  response: Response;
}) {
  const idToken = request.body?.id_token;
  if (typeof idToken === "string" && idToken.split(".").length === 3) {
    request.session.auth0IdToken = idToken;

    // The ID token's aud claim is the client_id it was issued to - record it
    // the same way the backend login flow does, for features (e.g.
    // session-transfer) that need to know which client this session is for.
    try {
      const { aud } = decodeJwtPayload(idToken) as { aud?: string };
      if (typeof aud === "string") {
        request.session.auth0ClientId = aud;
      }
    } catch {
      // Not critical to accepting the ID token itself.
    }
  }
  response.status(204).end();
}
