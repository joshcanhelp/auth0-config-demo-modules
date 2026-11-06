import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./../readTenantConfig.js", () => ({
  readTenantConfig: vi.fn(() => ({
    tenantDomain: "example.auth0.com",
    loginDomain: "example.auth0.com",
    customDomains: [],
    friendlyName: "Test Tenant",
  })),
}));

const mockTokenExchange = vi.fn();
vi.mock("../../auth0/apiAuthentication.js", () => ({
  createAuthenticationApi: vi.fn(() => ({ tokenExchange: mockTokenExchange })),
}));

import { renderSessionTransferPage } from "./renderSessionTransferPage.js";

const SESSION_CLIENT_ID = "session-client-id";

const config = {
  clientSecret: "exchange_client_secret",
  subjectTokenType: "https://example.com/subject",
  targetInitiateLoginUri: "https://target.example.com",
};

function makeReqRes(
  query: Record<string, unknown> = {},
  session: Record<string, unknown> = {}
) {
  const request = { query, session };
  const response = {
    locals: { tenantDataDir: "/tenant", auth0Domain: "example.auth0.com" },
    send: vi.fn(),
    status: vi.fn().mockReturnThis(),
  };
  return { request, response, session };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("renderSessionTransferPage", () => {
  it("responds 400 when subject_token is missing", async () => {
    const { request, response } = makeReqRes({}, { auth0IdToken: "actor-id-token", auth0ClientId: SESSION_CLIENT_ID });

    await renderSessionTransferPage({
      request: request as never,
      response: response as never,
      env: {},
      config,
    });

    expect(response.status).toHaveBeenCalledWith(400);
    expect(mockTokenExchange).not.toHaveBeenCalled();
  });

  it("responds 400 when there is no actor identity in session", async () => {
    const { request, response } = makeReqRes({ subject_token: "subject-jwt" }, {});

    await renderSessionTransferPage({
      request: request as never,
      response: response as never,
      env: {},
      config,
    });

    expect(response.status).toHaveBeenCalledWith(400);
    expect(mockTokenExchange).not.toHaveBeenCalled();
  });

  it("responds 400 when there is no client identity in session", async () => {
    const { request, response } = makeReqRes(
      { subject_token: "subject-jwt" },
      { auth0IdToken: "actor-id-token" }
    );

    await renderSessionTransferPage({
      request: request as never,
      response: response as never,
      env: {},
      config,
    });

    expect(response.status).toHaveBeenCalledWith(400);
    expect(mockTokenExchange).not.toHaveBeenCalled();
  });

  it("exchanges the subject and actor tokens and clears the session actor token", async () => {
    mockTokenExchange.mockResolvedValue({ access_token: "session-transfer-token" });
    const { request, response, session } = makeReqRes(
      { subject_token: "subject-jwt" },
      { auth0IdToken: "actor-id-token", auth0ClientId: SESSION_CLIENT_ID }
    );

    await renderSessionTransferPage({
      request: request as never,
      response: response as never,
      env: {},
      config,
    });

    expect(mockTokenExchange).toHaveBeenCalledWith({
      audience: "urn:example.auth0.com:session_transfer",
      subjectTokenType: config.subjectTokenType,
      subjectToken: "subject-jwt",
      actorTokenType: "urn:ietf:params:oauth:token-type:id_token",
      actorToken: "actor-id-token",
    });
    expect(session.auth0IdToken).toBeUndefined();
  });

  it("links to /v2/logout (to clear the actor's existing session first) with returnTo pointing at the target and session transfer token", async () => {
    mockTokenExchange.mockResolvedValue({ access_token: "session-transfer-token" });
    const { request, response } = makeReqRes(
      { subject_token: "subject-jwt" },
      { auth0IdToken: "actor-id-token", auth0ClientId: SESSION_CLIENT_ID }
    );

    await renderSessionTransferPage({
      request: request as never,
      response: response as never,
      env: {},
      config,
    });

    const html = response.send.mock.calls[0][0] as string;
    const expectedReturnTo = encodeURIComponent(
      "https://target.example.com/?session_transfer_token=session-transfer-token"
    );
    expect(html).toContain("https://example.auth0.com/v2/logout?");
    expect(html).toContain(`client_id=${SESSION_CLIENT_ID}`);
    expect(html).toContain(`returnTo=${expectedReturnTo}`);
  });

  it("uses a custom audience when provided", async () => {
    mockTokenExchange.mockResolvedValue({ access_token: "tok" });
    const { request, response } = makeReqRes(
      { subject_token: "subject-jwt" },
      { auth0IdToken: "actor-id-token", auth0ClientId: SESSION_CLIENT_ID }
    );

    await renderSessionTransferPage({
      request: request as never,
      response: response as never,
      env: {},
      config: { ...config, audience: "urn:custom:audience" },
    });

    expect(mockTokenExchange).toHaveBeenCalledWith(
      expect.objectContaining({ audience: "urn:custom:audience" })
    );
  });

  it("responds 502 when the token exchange fails", async () => {
    mockTokenExchange.mockRejectedValue(new Error("Invalid subject_token"));
    const { request, response } = makeReqRes(
      { subject_token: "subject-jwt" },
      { auth0IdToken: "actor-id-token", auth0ClientId: SESSION_CLIENT_ID }
    );

    await renderSessionTransferPage({
      request: request as never,
      response: response as never,
      env: {},
      config,
    });

    expect(response.status).toHaveBeenCalledWith(502);
  });

  it("responds 502 when the token exchange returns no access_token", async () => {
    mockTokenExchange.mockResolvedValue({});
    const { request, response } = makeReqRes(
      { subject_token: "subject-jwt" },
      { auth0IdToken: "actor-id-token", auth0ClientId: SESSION_CLIENT_ID }
    );

    await renderSessionTransferPage({
      request: request as never,
      response: response as never,
      env: {},
      config,
    });

    expect(response.status).toHaveBeenCalledWith(502);
  });
});
