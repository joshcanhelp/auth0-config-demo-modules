import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./readTenantConfig.js", () => ({
  readTenantConfig: vi.fn(() => ({
    tenantDomain: "example.auth0.com",
    loginDomain: "example.auth0.com",
    customDomains: [],
    friendlyName: "Test Tenant",
  })),
}));

vi.mock("../auth0/clientCredentials.js", () => ({
  getClientCredentialsTokenResponse: vi.fn(),
}));

vi.mock("../auth0/apiManagement.js", () => ({
  createManagementApi: vi.fn(),
}));

import { handleVerifyEmail } from "./handleVerifyEmail.js";
import { getClientCredentialsTokenResponse } from "../auth0/clientCredentials.js";
import { createManagementApi } from "../auth0/apiManagement.js";
import type { Auth0Client } from "../types.js";

const client: Auth0Client = {
  client_id: "web123",
  name: "Web App",
  app_type: "regular_web",
  grant_types: ["authorization_code", "client_credentials"],
  token_endpoint_auth_method: "client_secret_post",
  callbacks: [],
  allowed_logout_urls: [],
  allowed_origins: [],
};

const clientNoGrant: Auth0Client = {
  ...client,
  client_id: "web-no-grant",
  grant_types: ["authorization_code"],
};

const env = {
  "CLIENT_ID_web123_SECRET": "secret123",
  "CLIENT_ID_web-no-grant_SECRET": "secret-no-grant",
};

const tokenResponse = {
  access_token: "mgmt-token",
  expires_in: 86400,
  scope: "read:users update:users",
};

function makeReqRes(options: { sessionUserId?: string } = {}) {
  const createVerificationEmailJob = vi.fn().mockResolvedValue({ status: "pending" });
  vi.mocked(createManagementApi).mockReturnValue({
    createVerificationEmailJob,
  } as never);

  const req = {
    session: { auth0UserId: options.sessionUserId },
  };
  const res = {
    locals: {
      client,
      tenantDataDir: "/tenant",
      auth0Domain: "example.auth0.com",
    },
    send: vi.fn(),
  };
  return { req, res, createVerificationEmailJob };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getClientCredentialsTokenResponse).mockResolvedValue(tokenResponse);
});

describe("handleVerifyEmail", () => {
  it("shows a login prompt when no user is in session", async () => {
    const { req, res } = makeReqRes();

    await handleVerifyEmail({
      request: req as never,
      response: res as never,
      env,
    });

    const html = res.send.mock.calls[0][0] as string;
    expect(html).toContain("No user is logged in");
    expect(html).toContain("/login/web123");
  });

  it("shows failure step when client lacks client_credentials grant", async () => {
    const { req, res } = makeReqRes({ sessionUserId: "auth0|user" });
    res.locals.client = clientNoGrant;

    await handleVerifyEmail({
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
    const { req, res } = makeReqRes({ sessionUserId: "auth0|user" });

    await handleVerifyEmail({
      request: req as never,
      response: res as never,
      env,
    });

    const html = res.send.mock.calls[0][0] as string;
    expect(html).toContain("Token request failed");
    expect(html).toContain("Unauthorized");
  });

  it("shows failure step when token lacks update:users scope", async () => {
    vi.mocked(getClientCredentialsTokenResponse).mockResolvedValue({
      ...tokenResponse,
      scope: "read:users",
    });
    const { req, res } = makeReqRes({ sessionUserId: "auth0|user" });

    await handleVerifyEmail({
      request: req as never,
      response: res as never,
      env,
    });

    const html = res.send.mock.calls[0][0] as string;
    expect(html).toContain("Token has update:users scope");
    expect(html).toContain("#cf222e");
  });

  it("creates the job and shows success on success", async () => {
    const { req, res, createVerificationEmailJob } = makeReqRes({
      sessionUserId: "auth0|user",
    });

    await handleVerifyEmail({
      request: req as never,
      response: res as never,
      env,
    });

    expect(createVerificationEmailJob).toHaveBeenCalledWith("auth0|user", "web123");
    const html = res.send.mock.calls[0][0] as string;
    expect(html).toContain("Verification email job created");
    expect(html).toContain("Verification email sent");
  });

  it("shows failure step when client secret is missing", async () => {
    const { req, res } = makeReqRes({ sessionUserId: "auth0|user" });

    await handleVerifyEmail({
      request: req as never,
      response: res as never,
      env: {},
    });

    const html = res.send.mock.calls[0][0] as string;
    expect(html).toContain("Client secret is configured");
    expect(html).toContain("#cf222e");
  });
});
