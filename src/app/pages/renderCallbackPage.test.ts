import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => "/* spa callback script */"),
}));

vi.mock("./../readTenantConfig.js", () => ({
  readTenantConfig: vi.fn(() => ({
    tenantDomain: "example.auth0.com",
    loginDomain: "example.auth0.com",
    customDomains: [],
    friendlyName: "Test Tenant",
  })),
}));

vi.mock("./../detectLoginMethod.js", () => ({
  detectLoginMethod: vi.fn(),
}));

vi.mock("./../handleCallback.js", () => ({
  handleCallback: vi.fn(),
}));

import { detectLoginMethod } from "./../detectLoginMethod.js";
import { handleCallback } from "./../handleCallback.js";
import { renderCallbackPage } from "./renderCallbackPage.js";

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

  it("embeds frontendCallouts in the SPA page config for the frontend flow", async () => {
    mockDetectLoginMethod.mockReturnValue("frontend");
    const { request, response } = makeReqRes();

    await renderCallbackPage({
      request: request as never,
      response: response as never,
      env: {},
      frontendCallouts: [
        {
          claim: "impersonation_subject_jwt",
          hrefTemplate: "/session-transfer?subject_token={value}",
          label: "Continue",
        },
      ],
    });

    const html = response.send.mock.calls[0][0] as string;
    expect(html).toContain('"claim":"impersonation_subject_jwt"');
    expect(html).toContain('"hrefTemplate":"/session-transfer?subject_token={value}"');
    expect(html).toContain('<div id="callouts"></div>');
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

  it("renders HTML returned by a callout and passes it the login context", async () => {
    mockDetectLoginMethod.mockReturnValue("backend");
    mockHandleCallback.mockResolvedValue({
      tokens: { id_token: "raw.id.token" },
      idTokenClaims: { sub: "auth0|123", impersonation_subject_jwt: "subject-jwt" },
      rawAccessToken: undefined,
      decodedState: {},
    });
    const { request, response } = makeReqRes();
    const callout = vi.fn(({ idTokenClaims }) => {
      const claims = idTokenClaims as Record<string, unknown>;
      return `<p>Impersonate: ${claims.impersonation_subject_jwt}</p>`;
    });

    await renderCallbackPage({
      request: request as never,
      response: response as never,
      env: {},
      callouts: [callout],
    });

    expect(callout).toHaveBeenCalledWith(
      expect.objectContaining({
        idTokenClaims: { sub: "auth0|123", impersonation_subject_jwt: "subject-jwt" },
        client,
      })
    );
    const html = response.send.mock.calls[0][0] as string;
    expect(html).toContain("<p>Impersonate: subject-jwt</p>");
  });

  it("omits output from callouts that return null", async () => {
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
      callouts: [() => null],
    });

    expect(response.send).toHaveBeenCalled();
  });
});
