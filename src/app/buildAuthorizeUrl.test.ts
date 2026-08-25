import { describe, expect, it } from "vitest";

import { buildAuthorizeUrl } from "./buildAuthorizeUrl.js";
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

describe("buildAuthorizeUrl", () => {
  it("builds a valid authorize URL", () => {
    const { url } = buildAuthorizeUrl(
      client,
      "login.example.com",
      "http://localhost:3000"
    );
    expect(url).toContain("https://login.example.com/authorize");
    expect(url).toContain("client_id=abc123");
    expect(url).toContain("response_type=code");
    expect(url).toContain("code_challenge_method=S256");
  });

  it("derives the callback URL from baseUrl and client_id", () => {
    const { url } = buildAuthorizeUrl(
      client,
      "login.example.com",
      "http://localhost:3000"
    );
    expect(url).toContain(encodeURIComponent("http://localhost:3000/callback/abc123"));
  });

  it("generates PKCE and returns the code verifier", () => {
    const { url, codeVerifier } = buildAuthorizeUrl(
      client,
      "login.example.com",
      "http://localhost:3000"
    );
    expect(typeof codeVerifier).toBe("string");
    expect(codeVerifier.length).toBeGreaterThan(0);
    expect(url).toContain("code_challenge=");
  });

  it("generates an encoded state with a nonce when none is provided", () => {
    const { state, url } = buildAuthorizeUrl(
      client,
      "login.example.com",
      "http://localhost:3000"
    );
    expect(typeof state).toBe("string");
    expect(state.length).toBeGreaterThan(0);
    expect(url).toContain(`state=${state}`);
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString("utf-8")
    ) as Record<string, unknown>;
    expect(typeof decoded.nonce).toBe("string");
  });

  it("encodes provided state properties alongside the nonce", () => {
    const { state, url } = buildAuthorizeUrl(
      client,
      "login.example.com",
      "http://localhost:3000",
      { state: { returnTo: "/dashboard" } }
    );
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString("utf-8")
    ) as Record<string, unknown>;
    expect(decoded.returnTo).toBe("/dashboard");
    expect(typeof decoded.nonce).toBe("string");
    expect(url).toContain(`state=${state}`);
  });

  it("appends connection to the URL when provided", () => {
    const { url } = buildAuthorizeUrl(
      client,
      "login.example.com",
      "http://localhost:3000",
      { connection: "google-oauth2" }
    );
    expect(url).toContain("connection=google-oauth2");
  });

  it("appends extra params to the URL when provided", () => {
    const { url } = buildAuthorizeUrl(
      client,
      "login.example.com",
      "http://localhost:3000",
      {
        extraParams: { screen_hint: "signup", prompt: "login" },
      }
    );
    expect(url).toContain("screen_hint=signup");
    expect(url).toContain("prompt=login");
  });
});
