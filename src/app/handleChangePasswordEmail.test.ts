import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => "/* changePasswordEmail script */"),
}));

vi.mock("./readTenantConfig.js", () => ({
  readTenantConfig: vi.fn(() => ({
    tenantDomain: "example.auth0.com",
    loginDomain: "example.auth0.com",
    customDomains: [],
    friendlyName: "Test Tenant",
  })),
}));

vi.mock("./readConnections.js", () => ({
  readConnections: vi.fn(),
}));

import { handleChangePasswordEmail } from "./handleChangePasswordEmail.js";
import { readConnections } from "./readConnections.js";
import type { Auth0Client } from "../types.js";

const backendClient: Auth0Client = {
  client_id: "web123",
  name: "Web App",
  app_type: "regular_web",
  grant_types: ["authorization_code"],
  token_endpoint_auth_method: "client_secret_post",
  callbacks: ["http://localhost:3000/callback/web123"],
  allowed_logout_urls: [],
  allowed_origins: [],
};

const frontendClient: Auth0Client = {
  client_id: "spa456",
  name: "SPA App",
  app_type: "spa",
  grant_types: ["authorization_code"],
  token_endpoint_auth_method: "none",
  callbacks: ["http://localhost:3000/callback/spa456"],
  allowed_logout_urls: [],
  allowed_origins: [],
};

const dbConnection = { name: "Username-Password-Authentication", strategy: "auth0" };
const socialConnection = { name: "google-oauth2", strategy: "google-oauth2" };

function makeReqRes(client: Auth0Client, sessionEmail?: string) {
  const changePassword = vi.fn().mockResolvedValue(undefined);
  const req = {
    session: {
      auth0UserEmail: sessionEmail,
    },
  };
  const res = {
    locals: {
      client,
      tenantDataDir: "/tenant",
      auth0Domain: "example.auth0.com",
      authenticationApi: { changePassword },
    },
    send: vi.fn(),
  };
  return { req, res, changePassword };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readConnections).mockReturnValue([]);
});

describe("handleChangePasswordEmail", () => {
  describe("no database connections", () => {
    it("renders an error page when client has no database connections", async () => {
      vi.mocked(readConnections).mockReturnValue([socialConnection as never]);
      const { req, res } = makeReqRes(backendClient, "user@example.com");

      await handleChangePasswordEmail({
        request: req as never,
        response: res as never,
        env: { CLIENT_ID_web123_SECRET: "secret" },
      });

      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("No database connection");
    });
  });

  describe("backend client", () => {
    beforeEach(() => {
      vi.mocked(readConnections).mockReturnValue([dbConnection as never]);
    });

    it("renders login prompt when no user is in session", async () => {
      const { req, res } = makeReqRes(backendClient, undefined);

      await handleChangePasswordEmail({
        request: req as never,
        response: res as never,
        env: { CLIENT_ID_web123_SECRET: "secret" },
      });

      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("Please login");
      expect(html).toContain(`/login/${backendClient.client_id}`);
    });

    it("calls changePassword and shows success when user is in session", async () => {
      const { req, res, changePassword } = makeReqRes(backendClient, "user@example.com");

      await handleChangePasswordEmail({
        request: req as never,
        response: res as never,
        env: { CLIENT_ID_web123_SECRET: "secret" },
      });

      expect(changePassword).toHaveBeenCalledWith(
        "Username-Password-Authentication",
        "user@example.com"
      );
      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("user@example.com");
      expect(html).toContain("Check your inbox");
    });

    it("shows error message when changePassword throws", async () => {
      const { req, res, changePassword } = makeReqRes(backendClient, "user@example.com");
      changePassword.mockRejectedValue(new Error("Bad request"));

      await handleChangePasswordEmail({
        request: req as never,
        response: res as never,
        env: { CLIENT_ID_web123_SECRET: "secret" },
      });

      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("Failed to send");
      expect(html).toContain("Bad request");
    });
  });

  describe("frontend client", () => {
    beforeEach(() => {
      vi.mocked(readConnections).mockReturnValue([dbConnection as never]);
    });

    it("renders the browser script page with config", async () => {
      const { req, res } = makeReqRes(frontendClient);

      await handleChangePasswordEmail({
        request: req as never,
        response: res as never,
        env: {},
      });

      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("change-password-config");
      expect(html).toContain("spa456");
      expect(html).toContain("example.auth0.com");
      expect(html).toContain("Username-Password-Authentication");
    });

    it("inlines the changePasswordEmail browser script", async () => {
      const { req, res } = makeReqRes(frontendClient);

      await handleChangePasswordEmail({
        request: req as never,
        response: res as never,
        env: {},
      });

      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("/* changePasswordEmail script */");
    });

    it("renders action section and status elements", async () => {
      const { req, res } = makeReqRes(frontendClient);

      await handleChangePasswordEmail({
        request: req as never,
        response: res as never,
        env: {},
      });

      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain('id="status"');
      expect(html).toContain('id="action-section"');
      expect(html).toContain('id="change-password-btn"');
    });
  });
});
