import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => "/* spaLogin script */"),
}));

vi.mock("./readTenantConfig.js", () => ({
  readTenantConfig: vi.fn(() => ({
    tenantDomain: "example.auth0.com",
    loginDomain: "example.auth0.com",
    customDomains: [],
    friendlyName: "Test Tenant",
  })),
}));

vi.mock("./buildAuthorizeUrl.js", () => ({
  buildAuthorizeUrl: vi.fn(() => ({
    url: "https://example.auth0.com/authorize?client_id=abc123",
    state: "encoded-state",
    codeVerifier: "verifier-abc",
    codeChallenge: "challenge-xyz",
  })),
}));

import { handleLoginRedirect } from "./handleLoginRedirect.js";
import type { Auth0Client } from "../types.js";

const frontendClient: Auth0Client = {
  client_id: "abc123",
  name: "My SPA",
  app_type: "spa",
  grant_types: ["authorization_code"],
  token_endpoint_auth_method: "none",
  callbacks: ["http://localhost:3000/callback/abc123"],
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

function makeReqRes(client: Auth0Client, query: Record<string, string> = {}) {
  const session = {
    oauthState: undefined as string | undefined,
    pkceVerifier: undefined as string | undefined,
  };
  const req = { query, session };
  const res = {
    locals: {
      client,
      tenantDataDir: "/tenant",
      baseUrl: "http://localhost:3000",
      auth0Domain: "example.auth0.com",
    },
    send: vi.fn(),
    redirect: vi.fn(),
  };
  return { req, res, session };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleLoginRedirect", () => {
  describe("frontend login", () => {
    it("sends an HTML page instead of redirecting", () => {
      const { req, res } = makeReqRes(frontendClient);
      handleLoginRedirect({ request: req as never, response: res as never, env: {} });
      expect(res.send).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("embeds domain, clientId, and PKCE values in the page config", () => {
      const { req, res } = makeReqRes(frontendClient);
      handleLoginRedirect({ request: req as never, response: res as never, env: {} });
      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("spa-login-config");
      expect(html).toContain("example.auth0.com");
      expect(html).toContain("abc123");
      expect(html).toContain("encoded-state");
      expect(html).toContain("verifier-abc");
      expect(html).toContain("challenge-xyz");
    });

    it("inlines the spaLogin script", () => {
      const { req, res } = makeReqRes(frontendClient);
      handleLoginRedirect({ request: req as never, response: res as never, env: {} });
      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("/* spaLogin script */");
    });

    it("does not write to the session", () => {
      const { req, res, session } = makeReqRes(frontendClient);
      handleLoginRedirect({ request: req as never, response: res as never, env: {} });
      expect(session.oauthState).toBeUndefined();
      expect(session.pkceVerifier).toBeUndefined();
    });
  });

  describe("backend login", () => {
    it("redirects to the authorize URL", () => {
      const { req, res } = makeReqRes(backendClient);
      handleLoginRedirect({
        request: req as never,
        response: res as never,
        env: backendEnv,
      });
      expect(res.redirect).toHaveBeenCalledWith(
        "https://example.auth0.com/authorize?client_id=abc123"
      );
      expect(res.send).not.toHaveBeenCalled();
    });

    it("stores state and verifier in the session", () => {
      const { req, res, session } = makeReqRes(backendClient);
      handleLoginRedirect({
        request: req as never,
        response: res as never,
        env: backendEnv,
      });
      expect(session.oauthState).toBe("encoded-state");
      expect(session.pkceVerifier).toBe("verifier-abc");
    });
  });
});
