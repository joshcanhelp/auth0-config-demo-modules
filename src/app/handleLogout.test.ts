import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(() => "/* logout script */"),
}));

vi.mock("./readTenantConfig.js", () => ({
  readTenantConfig: vi.fn(() => ({
    tenantDomain: "example.auth0.com",
    loginDomain: "example.auth0.com",
    customDomains: [],
    friendlyName: "Test Tenant",
  })),
}));

import { handleLogout } from "./handleLogout.js";

function makeReqRes() {
  const session = {
    userId: "auth0|123",
    oauthState: "state",
    destroy: vi.fn((cb: () => void) => cb()),
  };
  const req = { session };
  const res = {
    locals: {
      tenantDataDir: "/tenant",
      baseUrl: "http://localhost:3000",
      auth0Domain: "example.auth0.com",
    },
    send: vi.fn(),
  };
  return { req, res, session };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleLogout", () => {
  it("destroys the session", () => {
    const { req, res, session } = makeReqRes();
    handleLogout({ request: req as never, response: res as never, env: {} });
    expect(session.destroy).toHaveBeenCalled();
  });

  it("sends a page with the Auth0 logout URL in config", () => {
    const { req, res } = makeReqRes();
    handleLogout({ request: req as never, response: res as never, env: {} });
    const html = res.send.mock.calls[0][0] as string;
    expect(html).toContain("logout-config");
    expect(html).toContain("example.auth0.com/v2/logout");
    expect(html).toContain(encodeURIComponent("http://localhost:3000"));
  });

  it("inlines the logout script", () => {
    const { req, res } = makeReqRes();
    handleLogout({ request: req as never, response: res as never, env: {} });
    const html = res.send.mock.calls[0][0] as string;
    expect(html).toContain("/* logout script */");
  });
});
