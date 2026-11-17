import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => "/* spa callback script */"),
}));

vi.mock("../../readTenantConfig.js", () => ({
  readTenantConfig: vi.fn(() => ({
    tenantDomain: "example.auth0.com",
    loginDomain: "example.auth0.com",
    customDomains: [],
    friendlyName: "Test Tenant",
  })),
}));

vi.mock("../../detectLoginMethod.js", () => ({
  detectLoginMethod: vi.fn(),
}));

vi.mock("./handleCallback.js", () => ({
  handleCallback: vi.fn(),
}));

import { detectLoginMethod } from "../../detectLoginMethod.js";
import { handleCallback } from "./handleCallback.js";
import { renderCallbackPage } from "./handler.js";

const mockDetectLoginMethod = vi.mocked(detectLoginMethod);
const mockHandleCallback = vi.mocked(handleCallback);

const client = { client_id: "abc123", name: "Test App" };

function makeReqRes() {
  const session: Record<string, unknown> = {};
  const request = { query: {}, session };
  const response = {
    locals: {
      tenantDataDir: "/tenant",
      baseUrl: "http://localhost:3000",
      auth0Domain: "example.auth0.com",
      client,
      authenticationApi: {},
    },
    send: vi.fn(),
  };
  return { request, response, session };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("renderCallbackPage", () => {
  it("includes a login again link for the frontend flow", async () => {
    mockDetectLoginMethod.mockReturnValue("frontend");
    const { request, response } = makeReqRes();

    await renderCallbackPage({
      request: request as never,
      response: response as never,
      env: {},
    });

    const html = response.send.mock.calls[0][0] as string;
    expect(html).toContain(`<a href="/login/${client.client_id}">Login again &rarr;</a>`);
  });

  it("throws when sessionDelegationIdTokenClaim is passed for the frontend flow", async () => {
    mockDetectLoginMethod.mockReturnValue("frontend");
    const { request, response } = makeReqRes();

    await expect(
      renderCallbackPage({
        request: request as never,
        response: response as never,
        env: {},
        sessionDelegationIdTokenClaim: "impersonation_subject_jwt",
      })
    ).rejects.toThrow(/frontend \(SPA\) login method/);
  });

  it("includes a login again link and stores the client ID in session for the backend flow", async () => {
    mockDetectLoginMethod.mockReturnValue("backend");
    mockHandleCallback.mockResolvedValue({
      tokens: {},
      idTokenClaims: { sub: "auth0|123", email: "test@example.com" },
      rawAccessToken: undefined,
      decodedState: {},
    });
    const { request, response, session } = makeReqRes();

    await renderCallbackPage({
      request: request as never,
      response: response as never,
      env: {},
    });

    const html = response.send.mock.calls[0][0] as string;
    expect(html).toContain(`<a href="/login/${client.client_id}">Login again &rarr;</a>`);
    expect(session.auth0ClientId).toBe(client.client_id);
  });

  it("stores the raw ID token in session for the backend flow", async () => {
    mockDetectLoginMethod.mockReturnValue("backend");
    mockHandleCallback.mockResolvedValue({
      tokens: { id_token: "raw.id.token" },
      idTokenClaims: { sub: "auth0|123" },
      rawAccessToken: undefined,
      decodedState: {},
    });
    const { request, response, session } = makeReqRes();

    await renderCallbackPage({
      request: request as never,
      response: response as never,
      env: {},
    });

    expect(session.auth0IdToken).toBe("raw.id.token");
  });

  it("renders the session delegation callout when the named claim is present", async () => {
    mockDetectLoginMethod.mockReturnValue("backend");
    mockHandleCallback.mockResolvedValue({
      tokens: { id_token: "raw.id.token" },
      idTokenClaims: { sub: "auth0|123", impersonation_subject_jwt: "subject-jwt" },
      rawAccessToken: undefined,
      decodedState: {},
    });
    const { request, response } = makeReqRes();

    await renderCallbackPage({
      request: request as never,
      response: response as never,
      env: {},
      sessionDelegationIdTokenClaim: "impersonation_subject_jwt",
    });

    const html = response.send.mock.calls[0][0] as string;
    expect(html).toContain("You chose to delegate your session.");
    expect(html).toContain("/session-transfer?subject_token=subject-jwt");
  });

  it("omits the session delegation callout when the named claim is absent", async () => {
    mockDetectLoginMethod.mockReturnValue("backend");
    mockHandleCallback.mockResolvedValue({
      tokens: {},
      idTokenClaims: { sub: "auth0|123" },
      rawAccessToken: undefined,
      decodedState: {},
    });
    const { request, response } = makeReqRes();

    await renderCallbackPage({
      request: request as never,
      response: response as never,
      env: {},
      sessionDelegationIdTokenClaim: "impersonation_subject_jwt",
    });

    const html = response.send.mock.calls[0][0] as string;
    expect(html).not.toContain("session delegation");
  });
});
