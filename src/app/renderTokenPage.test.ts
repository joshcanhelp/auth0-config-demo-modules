import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => "/* spaCallback script */"),
}));

vi.mock("./readTenantConfig.js", () => ({
  readTenantConfig: vi.fn(() => ({
    tenantDomain: "example.auth0.com",
    loginDomain: "example.auth0.com",
    customDomains: [],
    friendlyName: "Test Tenant",
  })),
}));

vi.mock("./handleCallback.js", () => ({
  handleCallback: vi.fn(),
}));

import { renderTokenPage } from "./renderTokenPage.js";
import { handleCallback } from "./handleCallback.js";
import type { Auth0Client } from "../types.js";

const frontendClient: Auth0Client = {
  client_id: "spa123",
  name: "My SPA",
  app_type: "spa",
  grant_types: ["authorization_code"],
  token_endpoint_auth_method: "none",
  callbacks: ["http://localhost:3000/callback/spa123"],
  allowed_logout_urls: [],
  allowed_origins: [],
};

const backendClient: Auth0Client = {
  ...frontendClient,
  client_id: "web456",
  name: "My Web App",
  app_type: "regular_web",
  token_endpoint_auth_method: "client_secret_post",
};

const backendEnv = { CLIENT_ID_web456_SECRET: "a-secret" };

function makeReqRes(client: Auth0Client) {
  const req = {
    query: { code: "auth-code", state: "some-state" },
    session: {
      oauthState: "some-state",
      pkceVerifier: "verifier",
      auth0UserId: undefined as string | undefined,
    },
  };
  const res = {
    locals: {
      client,
      tenantDataDir: "/tenant",
      baseUrl: "http://localhost:3000",
      auth0Domain: "example.auth0.com",
      authenticationApi: {},
    },
    send: vi.fn(),
  };
  return { req, res };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("renderTokenPage", () => {
  describe("frontend login", () => {
    it("renders an HTML shell without calling handleCallback", async () => {
      const { req, res } = makeReqRes(frontendClient);
      await renderTokenPage({ request: req as never, response: res as never, env: {} });
      expect(handleCallback).not.toHaveBeenCalled();
      expect(res.send).toHaveBeenCalled();
    });

    it("includes the spa-callback-config script block", async () => {
      const { req, res } = makeReqRes(frontendClient);
      await renderTokenPage({ request: req as never, response: res as never, env: {} });
      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("spa-callback-config");
      expect(html).toContain("spa123");
      expect(html).toContain("example.auth0.com");
      expect(html).toContain("http://localhost:3000/callback/spa123");
    });

    it("inlines the spaCallback script", async () => {
      const { req, res } = makeReqRes(frontendClient);
      await renderTokenPage({ request: req as never, response: res as never, env: {} });
      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("/* spaCallback script */");
    });

    it("renders the steps and tokens container divs", async () => {
      const { req, res } = makeReqRes(frontendClient);
      await renderTokenPage({ request: req as never, response: res as never, env: {} });
      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain('id="steps"');
      expect(html).toContain('id="tokens"');
    });
  });

  describe("backend login", () => {
    it("calls handleCallback and renders token data", async () => {
      const mockTokens = { access_token: "at", id_token: "it", expires_in: 86400 };
      vi.mocked(handleCallback).mockResolvedValue({
        tokens: mockTokens,
        idTokenClaims: { sub: "user123" },
        rawAccessToken: "at",
        decodedState: {},
      });

      const { req, res } = makeReqRes(backendClient);
      await renderTokenPage({
        request: req as never,
        response: res as never,
        env: backendEnv,
      });

      expect(handleCallback).toHaveBeenCalled();
      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("user123");
      expect(html).toContain("Token Response");
    });

    it("stores sub from idTokenClaims in session.userId", async () => {
      vi.mocked(handleCallback).mockResolvedValue({
        tokens: {},
        idTokenClaims: { sub: "auth0|abc" },
        rawAccessToken: undefined,
        decodedState: {},
      });

      const { req, res } = makeReqRes(backendClient);
      await renderTokenPage({
        request: req as never,
        response: res as never,
        env: backendEnv,
      });

      expect(req.session.auth0UserId).toBe("auth0|abc");
    });

    it("does not set session.userId when idTokenClaims has no sub", async () => {
      vi.mocked(handleCallback).mockResolvedValue({
        tokens: {},
        idTokenClaims: null,
        rawAccessToken: undefined,
        decodedState: {},
      });

      const { req, res } = makeReqRes(backendClient);
      await renderTokenPage({
        request: req as never,
        response: res as never,
        env: backendEnv,
      });

      expect(req.session.userId).toBeUndefined();
    });
  });
});
