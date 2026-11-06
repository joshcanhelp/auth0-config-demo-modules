import { describe, expect, it, vi } from "vitest";

import { handleStoreIdToken } from "./handleStoreIdToken.js";

function makeReqRes(body: Record<string, unknown> = {}) {
  const session: Record<string, unknown> = {};
  const request = { body, session };
  const response = { status: vi.fn().mockReturnThis(), end: vi.fn() };
  return { request, response, session };
}

describe("handleStoreIdToken", () => {
  it("stores a well-formed JWT in the session", () => {
    const { request, response, session } = makeReqRes({ id_token: "a.b.c" });

    handleStoreIdToken({ request: request as never, response: response as never });

    expect(session.auth0IdToken).toBe("a.b.c");
    expect(response.status).toHaveBeenCalledWith(204);
  });

  it("does not store a value that isn't a well-formed JWT", () => {
    const { request, response, session } = makeReqRes({ id_token: "not-a-jwt" });

    handleStoreIdToken({ request: request as never, response: response as never });

    expect(session.auth0IdToken).toBeUndefined();
    expect(response.status).toHaveBeenCalledWith(204);
  });

  it("does nothing when id_token is missing", () => {
    const { request, response, session } = makeReqRes({});

    handleStoreIdToken({ request: request as never, response: response as never });

    expect(session.auth0IdToken).toBeUndefined();
    expect(response.status).toHaveBeenCalledWith(204);
  });
});
