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
    expect(html).toContain(`<a href="/login/${client.client_id}">Login again</a>`);
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
    expect(html).toContain(`<a href="/login/${client.client_id}">Login again</a>`);
    expect(session.auth0ClientId).toBe(client.client_id);
  });
});
