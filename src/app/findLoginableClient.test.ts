import { describe, expect, it } from "vitest";

import { findLoginableClient } from "./findLoginableClient.js";
import type { Auth0Client } from "../types.js";

const loginableClient: Auth0Client = {
  client_id: "abc123",
  name: "Test App",
  app_type: "regular_web",
  grant_types: ["authorization_code"],
  token_endpoint_auth_method: "client_secret_post",
  callbacks: [],
  allowed_logout_urls: [],
  allowed_origins: [],
};

const nonInteractiveClient: Auth0Client = {
  client_id: "zzz999",
  name: "M2M App",
  app_type: "non_interactive",
  grant_types: ["client_credentials"],
  token_endpoint_auth_method: "client_secret_post",
  callbacks: [],
  allowed_logout_urls: [],
  allowed_origins: [],
};

describe("findLoginableClient", () => {
  it("returns the client when found and loginable", () => {
    const client = findLoginableClient([loginableClient], "abc123");
    expect(client.client_id).toBe("abc123");
  });

  it("throws when the client ID is not found", () => {
    expect(() => findLoginableClient([loginableClient], "unknown")).toThrow(
      "Client not found"
    );
  });

  it("throws when the client is non_interactive", () => {
    expect(() => findLoginableClient([nonInteractiveClient], "zzz999")).toThrow(
      "does not support login"
    );
  });
});
