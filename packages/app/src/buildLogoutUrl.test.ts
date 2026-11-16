import { describe, expect, it } from "vitest";

import { buildLogoutUrl } from "./buildLogoutUrl.js";

describe("buildLogoutUrl", () => {
  it("builds a valid OIDC logout URL", () => {
    const url = buildLogoutUrl({
      clientId: "abc123",
      loginDomain: "login.example.com",
    });
    expect(url).toContain("https://login.example.com/v2/logout");
    expect(url).toContain("client_id=abc123");
  });

  it("includes the returnTo URL", () => {
    const url = buildLogoutUrl({
      clientId: "abc123",
      loginDomain: "login.example.com",
      returnTo: "http://localhost:3000",
    });
    expect(url).toContain(encodeURIComponent("http://localhost:3000"));
  });

  it("omits client_id when none is given", () => {
    const url = buildLogoutUrl({
      loginDomain: "login.example.com",
    });
    expect(url).not.toContain("client_id");
  });
});
