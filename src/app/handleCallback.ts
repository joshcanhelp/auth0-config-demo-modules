import assert from "node:assert/strict";
import { decodeJwtPayload } from "../utils/jwt.js";

import type { createAuthenticationApi } from "../auth0/apiAuthentication.js";

interface CallbackSession {
  oauthState?: string;
  pkceVerifier?: string;
}

export interface CallbackParams {
  query: { code?: string; state?: string; error?: string; error_description?: string };
  session: CallbackSession;
  clientId: string;
  baseUrl: string;
  authenticationApi: ReturnType<typeof createAuthenticationApi>;
}

export interface CallbackResult {
  tokens: Record<string, unknown>;
  idTokenClaims: unknown;
  rawAccessToken: string | undefined;
  decodedState: Record<string, unknown>;
}

export function decodeState(encodedState: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(encodedState, "base64url").toString("utf-8")) as Record<
    string,
    unknown
  >;
}

export async function handleCallback(params: CallbackParams): Promise<CallbackResult> {
  const { code, state, error, error_description } = params.query;

  if (error) {
    throw new Error(
      `Auth error: ${error} - ${error_description ?? "no description returned"}`
    );
  }

  assert(code, "Missing code parameter");
  assert(state, "Missing state parameter");

  const sessionState = params.session.oauthState ?? "";
  const codeVerifier = params.session.pkceVerifier ?? "";

  params.session.oauthState = undefined;
  params.session.pkceVerifier = undefined;

  assert(state === sessionState, "Invalid state parameter");

  const callbackUrl = `${params.baseUrl}/callback/${params.clientId}`;

  const tokens = await params.authenticationApi.exchangeCodeForToken(
    code,
    callbackUrl,
    codeVerifier
  );

  // TODO: Validate the ID token here using the JWKS endpoint and the client secret or public key.
  const idTokenClaims = tokens.id_token
    ? decodeJwtPayload(tokens.id_token as string)
    : null;
  const rawAccessToken = tokens.access_token as string | undefined;
  const decodedState = decodeState(state);

  return { tokens, idTokenClaims, rawAccessToken, decodedState };
}
