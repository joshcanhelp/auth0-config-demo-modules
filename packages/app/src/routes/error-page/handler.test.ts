import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../readTenantConfig.js", () => ({
  readTenantConfig: vi.fn(() => ({
    tenantDomain: "example.auth0.com",
    loginDomain: "example.auth0.com",
    customDomains: [],
    friendlyName: "Test Tenant",
  })),
}));

import { handleErrorPage } from "./handler.js";

function makeReqRes(query: Record<string, string> = {}) {
  const req = { query };
  const res = {
    locals: { tenantDataDir: "/tenant" },
    status: vi.fn().mockReturnThis(),
    send: vi.fn(),
  };
  return { req, res };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleErrorPage", () => {
  it("responds with 400 status", async () => {
    const { req, res } = makeReqRes({ error: "access_denied" });
    await handleErrorPage({ request: req as never, response: res as never, env: {} });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("renders the error and description", async () => {
    const { req, res } = makeReqRes({
      error: "access_denied",
      error_description: "User did not authorize the request",
    });
    await handleErrorPage({ request: req as never, response: res as never, env: {} });
    const html = res.send.mock.calls[0][0] as string;
    expect(html).toContain("access_denied");
    expect(html).toContain("User did not authorize the request");
  });

  it("renders the tracking ID when present", async () => {
    const { req, res } = makeReqRes({ error: "server_error", tracking: "abc123" });
    await handleErrorPage({ request: req as never, response: res as never, env: {} });
    const html = res.send.mock.calls[0][0] as string;
    expect(html).toContain("abc123");
    expect(html).toContain("Tracking ID");
  });

  it("omits rows for absent parameters", async () => {
    const { req, res } = makeReqRes({ error: "access_denied" });
    await handleErrorPage({ request: req as never, response: res as never, env: {} });
    const html = res.send.mock.calls[0][0] as string;
    expect(html).not.toContain("Tracking ID");
    expect(html).not.toContain("Connection");
  });
});
