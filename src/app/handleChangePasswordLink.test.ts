import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => "/* changePasswordLink script */"),
}));

vi.mock("./readTenantConfig.js", () => ({
  readTenantConfig: vi.fn(() => ({
    tenantDomain: "example.auth0.com",
    loginDomain: "example.auth0.com",
    customDomains: [],
    friendlyName: "Test Tenant",
  })),
}));

vi.mock("./readClients.js", () => ({
  readClients: vi.fn(),
}));

vi.mock("../auth0/clientCredentials.js", () => ({
  getClientCredentialsTokenResponse: vi.fn(),
}));

vi.mock("../auth0/apiManagement.js", () => ({
  createManagementApi: vi.fn(),
}));

import { handleChangePasswordLink } from "./handleChangePasswordLink.js";
import { readClients } from "./readClients.js";
import { getClientCredentialsTokenResponse } from "../auth0/clientCredentials.js";
import { createManagementApi } from "../auth0/apiManagement.js";
import type { Auth0Client } from "../types.js";

const backendClient: Auth0Client = {
  client_id: "web123",
  name: "Web App",
  app_type: "regular_web",
  grant_types: ["authorization_code", "client_credentials"],
  token_endpoint_auth_method: "client_secret_post",
  callbacks: [],
  allowed_logout_urls: [],
  allowed_origins: [],
};

const backendClientNoGrant: Auth0Client = {
  ...backendClient,
  client_id: "web-no-grant",
  grant_types: ["authorization_code"],
};

const spaClient: Auth0Client = {
  client_id: "spa456",
  name: "SPA App",
  app_type: "spa",
  grant_types: ["authorization_code"],
  token_endpoint_auth_method: "none",
  callbacks: [],
  allowed_logout_urls: [],
  allowed_origins: [],
  client_metadata: { bff_client_id: "bff789" },
};

const spaClientNoBff: Auth0Client = {
  ...spaClient,
  client_id: "spa-no-bff",
  client_metadata: undefined,
};

const bffClient: Auth0Client = {
  client_id: "bff789",
  name: "BFF",
  app_type: "regular_web",
  grant_types: ["authorization_code", "client_credentials"],
  token_endpoint_auth_method: "client_secret_post",
  callbacks: [],
  allowed_logout_urls: [],
  allowed_origins: [],
};

const env = {
  "CLIENT_ID_web123_SECRET": "secret123",
  "CLIENT_ID_web-no-grant_SECRET": "secret-no-grant",
  "CLIENT_ID_bff789_SECRET": "bff-secret",
};

const tokenResponse = {
  access_token: "mgmt-token",
  expires_in: 86400,
  scope: "read:users create:user_tickets",
};

function makeReqRes(
  client: Auth0Client,
  options: { sessionUserId?: string; method?: string; body?: unknown } = {}
) {
  const createPasswordTicket = vi
    .fn()
    .mockResolvedValue({ ticket: "https://example.auth0.com/lo/reset/..." });
  vi.mocked(createManagementApi).mockReturnValue({ createPasswordTicket } as never);

  const req = {
    method: options.method ?? "GET",
    session: { auth0UserId: options.sessionUserId },
    body: options.body ?? {},
  };
  const res = {
    locals: {
      client,
      tenantDataDir: "/tenant",
      auth0Domain: "example.auth0.com",
    },
    send: vi.fn(),
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  };
  return { req, res, createPasswordTicket };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readClients).mockReturnValue([bffClient]);
  vi.mocked(getClientCredentialsTokenResponse).mockResolvedValue(tokenResponse);
});

describe("handleChangePasswordLink", () => {
  describe("GET - backend client", () => {
    it("shows failure step when client lacks client_credentials grant", async () => {
      const { req, res } = makeReqRes(backendClientNoGrant, {
        sessionUserId: "auth0|user",
      });

      await handleChangePasswordLink({
        request: req as never,
        response: res as never,
        env,
      });

      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("Client has client_credentials grant");
      expect(html).toContain("#cf222e");
    });

    it("shows failure step when token request fails", async () => {
      vi.mocked(getClientCredentialsTokenResponse).mockRejectedValue(
        new Error("Unauthorized")
      );
      const { req, res } = makeReqRes(backendClient, { sessionUserId: "auth0|user" });

      await handleChangePasswordLink({
        request: req as never,
        response: res as never,
        env,
      });

      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("Token request failed");
      expect(html).toContain("Unauthorized");
    });

    it("shows failure step when token lacks create:user_tickets scope", async () => {
      vi.mocked(getClientCredentialsTokenResponse).mockResolvedValue({
        ...tokenResponse,
        scope: "read:users",
      });
      const { req, res } = makeReqRes(backendClient, { sessionUserId: "auth0|user" });

      await handleChangePasswordLink({
        request: req as never,
        response: res as never,
        env,
      });

      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("Token has create:user_tickets scope");
      expect(html).toContain("#cf222e");
    });

    it("shows failure step when no user in session", async () => {
      const { req, res } = makeReqRes(backendClient);

      await handleChangePasswordLink({
        request: req as never,
        response: res as never,
        env,
      });

      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("User is logged in");
      expect(html).toContain("#cf222e");
    });

    it("creates ticket and shows the link on success", async () => {
      const { req, res, createPasswordTicket } = makeReqRes(backendClient, {
        sessionUserId: "auth0|user",
      });

      await handleChangePasswordLink({
        request: req as never,
        response: res as never,
        env,
      });

      expect(createPasswordTicket).toHaveBeenCalledWith({ user_id: "auth0|user" });
      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("Password change ticket created");
      expect(html).toContain("ticket-link");
    });
  });

  describe("GET - SPA client without bff_client_id", () => {
    it("renders an error page", async () => {
      const { req, res } = makeReqRes(spaClientNoBff);

      await handleChangePasswordLink({
        request: req as never,
        response: res as never,
        env,
      });

      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("bff_client_id");
    });
  });

  describe("GET - SPA client with bff_client_id", () => {
    it("renders the browser script page", async () => {
      const { req, res } = makeReqRes(spaClient);

      await handleChangePasswordLink({
        request: req as never,
        response: res as never,
        env,
      });

      const html = res.send.mock.calls[0][0] as string;
      expect(html).toContain("change-password-link-config");
      expect(html).toContain("spa456");
      expect(html).toContain("/* changePasswordLink script */");
    });
  });

  describe("POST - SPA browser script", () => {
    it("returns JSON with failure step when bff_client_id is not found in clients", async () => {
      vi.mocked(readClients).mockReturnValue([]);
      const { req, res } = makeReqRes(spaClient, {
        method: "POST",
        body: { user_id: "auth0|user" },
      });

      await handleChangePasswordLink({
        request: req as never,
        response: res as never,
        env,
      });

      const json = res.json.mock.calls[0][0] as { steps: { success: boolean }[] };
      expect(json.steps[0].success).toBe(false);
    });

    it("returns JSON with all steps and ticket on success", async () => {
      const { req, res, createPasswordTicket } = makeReqRes(spaClient, {
        method: "POST",
        body: { user_id: "auth0|user" },
      });

      await handleChangePasswordLink({
        request: req as never,
        response: res as never,
        env,
      });

      expect(createPasswordTicket).toHaveBeenCalledWith({ user_id: "auth0|user" });
      const json = res.json.mock.calls[0][0] as {
        steps: { label: string; success: boolean }[];
        ticket: string;
      };
      expect(json.ticket).toContain("https://");
      expect(json.steps.every((s) => s.success)).toBe(true);
    });

    it("returns JSON failure when BFF secret is missing", async () => {
      const { req, res } = makeReqRes(spaClient, {
        method: "POST",
        body: { user_id: "auth0|user" },
      });

      await handleChangePasswordLink({
        request: req as never,
        response: res as never,
        env: {},
      });

      const json = res.json.mock.calls[0][0] as {
        steps: { success: boolean; label: string }[];
      };
      const secretStep = json.steps.find((s) => s.label.includes("secret"));
      expect(secretStep?.success).toBe(false);
    });
  });
});
