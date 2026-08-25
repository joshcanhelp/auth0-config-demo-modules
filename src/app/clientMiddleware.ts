import { strict as assert } from "node:assert";

import type { RequestHandler } from "express";

import { findClient, findLoginableClient } from "./findLoginableClient.js";
import type { Auth0Client } from "../types.js";
import { createAuthenticationApi } from "../auth0/apiAuthentication.js";

interface ClientMiddlewareOptions {
  loginableOnly?: boolean;
}

export function createClientMiddleware(
  getClients: () => Auth0Client[],
  options?: ClientMiddlewareOptions
): RequestHandler {
  return (req, res, next) => {
    const clientId = String(req.params.clientId);
    assert(clientId, "clientId is required");

    let client: Auth0Client;
    try {
      client = options?.loginableOnly
        ? findLoginableClient(getClients(), clientId)
        : findClient(getClients(), clientId);
    } catch (err) {
      res
        .status(404)
        .send(err instanceof Error ? err.message : `Client ID ${clientId} not found`);
      return;
    }

    res.locals.client = client;
    res.locals.authenticationApi = createAuthenticationApi(
      res.locals.auth0Domain,
      clientId,
      process.env[`CLIENT_ID_${clientId}_SECRET`]
    );
    next();
  };
}
