import type { Request, Response } from "express";

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
  }
  response.status(204).end();
}
