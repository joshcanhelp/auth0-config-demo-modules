import crypto from "node:crypto";

import { generatePkce } from "./pkce.js";
import type { Auth0Client } from "../types.js";

export interface AuthorizeResult {
  url: string;
  state: string;
  codeVerifier: string;
}

export interface AuthorizeOptions {
  state?: Record<string, unknown>;
  connection?: string;
  extraParams?: Record<string, string>;
}

export function encodeState(state: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

export function buildAuthorizeUrl(
  client: Auth0Client,
  loginDomain: string,
  baseUrl: string,
  options?: AuthorizeOptions
): AuthorizeResult {
  const nonce = crypto.randomBytes(16).toString("hex");
  const encodedState = encodeState({ ...(options?.state ?? {}), nonce });
  const pkce = generatePkce();
  const callbackUrl = `${baseUrl}/callback/${client.client_id}`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: client.client_id,
    redirect_uri: callbackUrl,
    scope: "openid profile email",
    state: encodedState,
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
  });

  if (options?.connection) {
    params.set("connection", options.connection);
  }

  if (options?.extraParams) {
    for (const [key, value] of Object.entries(options.extraParams)) {
      params.set(key, value);
    }
  }

  return {
    url: `https://${loginDomain}/authorize?${params}`,
    state: encodedState,
    codeVerifier: pkce.verifier,
  };
}
