import { describe, expect, it, vi, beforeEach } from "vitest";

import { decodeState, handleCallback } from "./handleCallback.js";
import { encodeState } from "./buildAuthorizeUrl.js";

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from('{"alg":"RS256"}').toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

const validState = encodeState({ returnTo: "/home", nonce: "testnonce" });

const mockExchangeCodeForToken = vi.fn();
const authenticationApi = {
  exchangeCodeForToken: mockExchangeCodeForToken,
  getToken: vi.fn(),
  verifyOobCode: vi.fn(),
  changePassword: vi.fn(),
  startPasswordless: vi.fn(),
};

function makeSession(overrides?: { oauthState?: string; pkceVerifier?: string }) {
  return { oauthState: validState, pkceVerifier: "verifier", ...overrides };
}

const baseQuery = { code: "auth-code", state: validState };
const baseCallbackParams = {
  clientId: "abc123",
  baseUrl: "http://localhost:3000",
  authenticationApi,
};

function makeBaseParams() {
  return { query: baseQuery, session: makeSession(), ...baseCallbackParams };
}

beforeEach(() => {
  mockExchangeCodeForToken.mockReset();
});

describe("decodeState", () => {
  it("decodes a base64url-encoded state object", () => {
    const state = { nonce: "abc123", returnTo: "/dashboard" };
    const encoded = Buffer.from(JSON.stringify(state)).toString("base64url");

    const decoded = decodeState(encoded);
    expect(decoded).toEqual(state);
  });

  it("returns an empty object when state has no extra properties", () => {
    const state = { nonce: "abc123" };
    const encoded = Buffer.from(JSON.stringify(state)).toString("base64url");

    const decoded = decodeState(encoded);
    expect(decoded).toEqual(state);
  });
});

describe("handleCallback", () => {
  it("throws when an OAuth error is returned in the query", async () => {
    await expect(
      handleCallback({
        ...makeBaseParams(),
        query: { error: "access_denied", error_description: "User denied" },
      })
    ).rejects.toThrow("Auth error: access_denied - User denied");
  });

  it("throws when code is missing", async () => {
    await expect(
      handleCallback({ ...makeBaseParams(), query: { state: validState } })
    ).rejects.toThrow();
  });

  it("throws when state is missing", async () => {
    await expect(
      handleCallback({ ...makeBaseParams(), query: { code: "auth-code" } })
    ).rejects.toThrow();
  });

  it("throws when state does not match session state", async () => {
    await expect(
      handleCallback({
        ...makeBaseParams(),
        session: makeSession({ oauthState: "different" }),
      })
    ).rejects.toThrow("Invalid state parameter");
  });

  it("clears oauthState and pkceVerifier from the session", async () => {
    mockExchangeCodeForToken.mockResolvedValue({});
    const session = makeSession();

    await handleCallback({ ...makeBaseParams(), session });

    expect(session.oauthState).toBeUndefined();
    expect(session.pkceVerifier).toBeUndefined();
  });

  it("calls exchangeCodeForToken with code, constructed callbackUrl, and codeVerifier", async () => {
    mockExchangeCodeForToken.mockResolvedValue({});

    await handleCallback(makeBaseParams());

    expect(mockExchangeCodeForToken).toHaveBeenCalledWith(
      "auth-code",
      "http://localhost:3000/callback/abc123",
      "verifier"
    );
  });

  it("returns decoded id token claims", async () => {
    const claims = { sub: "user123", email: "user@example.com" };
    mockExchangeCodeForToken.mockResolvedValue({ id_token: makeJwt(claims) });

    const result = await handleCallback(makeBaseParams());
    expect(result.idTokenClaims).toEqual(claims);
  });

  it("returns null idTokenClaims when no id_token in response", async () => {
    mockExchangeCodeForToken.mockResolvedValue({ access_token: "at" });

    const result = await handleCallback(makeBaseParams());
    expect(result.idTokenClaims).toBeNull();
  });

  it("returns the raw access token string", async () => {
    mockExchangeCodeForToken.mockResolvedValue({ access_token: "raw.access.token" });

    const result = await handleCallback(makeBaseParams());
    expect(result.rawAccessToken).toBe("raw.access.token");
  });

  it("returns undefined rawAccessToken when no access_token in response", async () => {
    mockExchangeCodeForToken.mockResolvedValue({ id_token: makeJwt({ sub: "u" }) });

    const result = await handleCallback(makeBaseParams());
    expect(result.rawAccessToken).toBeUndefined();
  });

  it("returns the decoded state object", async () => {
    mockExchangeCodeForToken.mockResolvedValue({});

    const result = await handleCallback(makeBaseParams());
    expect(result.decodedState).toEqual({ returnTo: "/home", nonce: "testnonce" });
  });

  it("returns the full token response", async () => {
    const tokens = {
      access_token: "at",
      id_token: makeJwt({ sub: "u" }),
      expires_in: 86400,
    };
    mockExchangeCodeForToken.mockResolvedValue(tokens);

    const result = await handleCallback(makeBaseParams());
    expect(result.tokens).toEqual(tokens);
  });
});
