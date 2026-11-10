import { afterEach, describe, expect, it, vi } from "vitest";
import { checkDomainIsReachable } from "./checkDomainIsReachable.js";

describe("checkDomainIsReachable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves when the domain serves a matching OIDC configuration", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ issuer: "https://my-tenant.us.auth0.com/" }),
      })
    );

    await expect(
      checkDomainIsReachable("my-tenant.us.auth0.com")
    ).resolves.toBeUndefined();
  });

  it("throws when the request is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    );

    await expect(checkDomainIsReachable("not-a-tenant.example.com")).rejects.toThrow(
      /does not look like an Auth0 tenant domain/
    );
  });

  it("throws when the issuer doesn't match the domain", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ issuer: "https://some-other-tenant.us.auth0.com/" }),
      })
    );

    await expect(checkDomainIsReachable("my-tenant.us.auth0.com")).rejects.toThrow(
      /unexpected issuer/
    );
  });

  it("throws a descriptive error when the network request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND")));

    await expect(checkDomainIsReachable("bad-domain.example.com")).rejects.toThrow(
      /Could not reach/
    );
  });
});
