import { describe, expect, it } from "vitest";

import { buildLogoutUrl } from "./buildLogoutUrl.js";
import type { Auth0Client } from "../types.js";

const client: Auth0Client = {
  client_id: "abc123",
  name: "Test App",
  app_type: "regular_web",
  grant_types: ["authorization_code"],
  token_endpoint_auth_method: "client_secret_post",
  callbacks: [],
  allowed_logout_urls: [],
  allowed_origins: [],
};

describe("buildLogoutUrl", () => {
  it("builds a valid OIDC logout URL", () => {
    const url = buildLogoutUrl({
      client,
      loginDomain: "login.example.com",
    });
    expect(url).toContain("https://login.example.com/v2/logout");
    expect(url).toContain("client_id=abc123");
  });

  it("includes the returnTo URL", () => {
    const url = buildLogoutUrl({
      client,
      loginDomain: "login.example.com",
      returnTo: "http://localhost:3000",
    });
    expect(url).toContain(encodeURIComponent("http://localhost:3000"));
  });
});
