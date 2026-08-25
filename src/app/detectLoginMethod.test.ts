import { describe, expect, it } from "vitest";

import { detectLoginMethod } from "./detectLoginMethod.js";
import type { Auth0Client } from "../types.js";

const baseClient: Auth0Client = {
  client_id: "abc123",
  name: "Test App",
  app_type: "regular_web",
  grant_types: ["authorization_code"],
  token_endpoint_auth_method: "client_secret_post",
  callbacks: [],
  allowed_logout_urls: [],
  allowed_origins: [],
};

describe("detectLoginMethod", () => {
  it("returns backend when token_endpoint_auth_method requires secret and secret exists", () => {
    const env = { CLIENT_ID_abc123_SECRET: "my-secret" };
    expect(detectLoginMethod(baseClient, env)).toBe("backend");
  });

  it("returns frontend when token_endpoint_auth_method requires secret but no secret in env", () => {
    expect(detectLoginMethod(baseClient, {})).toBe("frontend");
  });

  it("returns frontend when token_endpoint_auth_method is none even if secret is present", () => {
    const client = { ...baseClient, token_endpoint_auth_method: "none" };
    const env = { CLIENT_ID_abc123_SECRET: "my-secret" };
    expect(detectLoginMethod(client, env)).toBe("frontend");
  });

  it("returns frontend when token_endpoint_auth_method is none and no secret", () => {
    const client = { ...baseClient, token_endpoint_auth_method: "none" };
    expect(detectLoginMethod(client, {})).toBe("frontend");
  });
});
