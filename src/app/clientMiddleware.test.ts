import { describe, expect, it, vi } from "vitest";

import { createClientMiddleware } from "./clientMiddleware.js";
import type { Auth0Client } from "../types.js";

const client: Auth0Client = {
  client_id: "abc123",
  name: "Test App",
  app_type: "spa",
  grant_types: ["authorization_code"],
  token_endpoint_auth_method: "none",
  callbacks: [],
  allowed_logout_urls: [],
  allowed_origins: [],
};

function makeRes() {
  const res = {
    locals: { auth0Domain: "example.auth0.com" } as Record<string, unknown>,
    status: vi.fn(),
    send: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe("createClientMiddleware", () => {
  it("sets res.locals.client and calls next for a valid loginable client", () => {
    const middleware = createClientMiddleware(() => [client]);
    const req = { params: { clientId: "abc123" } };
    const res = makeRes();
    const next = vi.fn();

    middleware(req as never, res as never, next);

    expect(res.locals.client).toBe(client);
    expect(next).toHaveBeenCalled();
  });

  it("responds 404 when the client id is not found", () => {
    const middleware = createClientMiddleware(() => [client]);
    const req = { params: { clientId: "unknown" } };
    const res = makeRes();
    const next = vi.fn();

    middleware(req as never, res as never, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining("not found"));
    expect(next).not.toHaveBeenCalled();
  });

  it("allows non_interactive clients through by default", () => {
    const nonInteractive: Auth0Client = {
      ...client,
      client_id: "m2m",
      app_type: "non_interactive",
      grant_types: ["client_credentials"],
    };
    const middleware = createClientMiddleware(() => [nonInteractive]);
    const req = { params: { clientId: "m2m" } };
    const res = makeRes();
    const next = vi.fn();

    middleware(req as never, res as never, next);

    expect(res.locals.client).toBe(nonInteractive);
    expect(next).toHaveBeenCalled();
  });

  it("responds 404 for non_interactive clients when loginableOnly is set", () => {
    const nonInteractive: Auth0Client = {
      ...client,
      client_id: "m2m",
      app_type: "non_interactive",
      grant_types: ["client_credentials"],
    };
    const middleware = createClientMiddleware(() => [nonInteractive], {
      loginableOnly: true,
    });
    const req = { params: { clientId: "m2m" } };
    const res = makeRes();
    const next = vi.fn();

    middleware(req as never, res as never, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });
});
