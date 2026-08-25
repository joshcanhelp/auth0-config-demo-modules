import { describe, expect, it } from "vitest";

import { validateClient } from "./validateClient.js";
import type { Auth0Client } from "../types.js";

const validClient: Auth0Client = {
  client_id: "abc123",
  name: "Test App",
  app_type: "regular_web",
  grant_types: ["authorization_code"],
  token_endpoint_auth_method: "client_secret_post",
  callbacks: [],
  allowed_logout_urls: [],
  allowed_origins: [],
};

describe("validateClient", () => {
  it("returns no errors for a valid client", () => {
    expect(
      validateClient(validClient, { CLIENT_ID_abc123_SECRET: "secret" })
    ).toHaveLength(0);
  });

  it("returns an error for each missing required field", () => {
    const { client_id: _id, ...withoutId } = validClient;
    const errors = validateClient(withoutId as Auth0Client, {
      CLIENT_ID_abc123_SECRET: "secret",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("client_id");
  });

  it("passes for a regular_web client with client_credentials grant", () => {
    const client = { ...validClient, grant_types: ["client_credentials"] };
    expect(validateClient(client, { CLIENT_ID_abc123_SECRET: "secret" })).toHaveLength(0);
  });

  it("passes for a valid non_interactive client with client_credentials and secret", () => {
    const client = {
      ...validClient,
      app_type: "non_interactive",
      grant_types: ["client_credentials"],
    };
    expect(validateClient(client, { CLIENT_ID_abc123_SECRET: "secret" })).toHaveLength(0);
  });

  it("returns an error for non_interactive without the secret env var", () => {
    const client = {
      ...validClient,
      app_type: "non_interactive",
      grant_types: ["client_credentials"],
    };
    const errors = validateClient(client, {});
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("CLIENT_ID_abc123_SECRET");
  });

  it("returns an error when non_interactive has grant_types other than client_credentials", () => {
    const client = { ...validClient, app_type: "non_interactive" };
    const errors = validateClient(client, { CLIENT_ID_abc123_SECRET: "secret" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("non_interactive");
  });

  it("returns errors when non_interactive has callbacks, logout URLs, or origins", () => {
    const client = {
      ...validClient,
      app_type: "non_interactive",
      grant_types: ["client_credentials"],
      callbacks: ["https://example.com/callback"],
      allowed_logout_urls: ["https://example.com"],
      allowed_origins: ["https://example.com"],
    };
    const errors = validateClient(client, { CLIENT_ID_abc123_SECRET: "secret" });
    expect(errors).toContain("non_interactive app_type must not have callbacks");
    expect(errors).toContain(
      "non_interactive app_type must not have allowed_logout_urls"
    );
    expect(errors).toContain("non_interactive app_type must not have allowed_origins");
  });

  it("passes for clients with both authorization_code and client_credentials", () => {
    const client = {
      ...validClient,
      grant_types: ["authorization_code", "client_credentials"],
    };
    expect(validateClient(client, { CLIENT_ID_abc123_SECRET: "secret" })).toHaveLength(0);
  });

  it("passes for spa with only authorization_code", () => {
    const client = {
      ...validClient,
      app_type: "spa",
      grant_types: ["authorization_code"],
    };
    expect(validateClient(client)).toHaveLength(0);
  });

  it("passes for spa with authorization_code and refresh_token", () => {
    const client = {
      ...validClient,
      app_type: "spa",
      grant_types: ["authorization_code", "refresh_token"],
    };
    expect(validateClient(client)).toHaveLength(0);
  });

  it("returns an error for regular_web without client_secret_post auth method", () => {
    const client = { ...validClient, token_endpoint_auth_method: "none" };
    const errors = validateClient(client, { CLIENT_ID_abc123_SECRET: "secret" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("client_secret_post");
  });

  it("returns an error for regular_web without the secret env var", () => {
    const errors = validateClient(validClient, {});
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("CLIENT_ID_abc123_SECRET");
  });

  it("returns an error for spa with disallowed grant types", () => {
    const client = {
      ...validClient,
      app_type: "spa",
      grant_types: ["authorization_code", "client_credentials"],
    };
    const errors = validateClient(client);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("spa");
  });

  it("passes for regular_web without allowed_origins", () => {
    const { allowed_origins: _, ...withoutOrigins } = validClient;
    expect(
      validateClient(withoutOrigins as Auth0Client, { CLIENT_ID_abc123_SECRET: "secret" })
    ).toHaveLength(0);
  });

  it("returns an error for spa without allowed_origins", () => {
    const { allowed_origins: _, ...withoutOrigins } = validClient;
    const client = {
      ...withoutOrigins,
      app_type: "spa",
      grant_types: ["authorization_code"],
    };
    const errors = validateClient(client as Auth0Client);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("allowed_origins");
  });
});
