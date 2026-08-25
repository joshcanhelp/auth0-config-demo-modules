import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAuthenticationApi } from "./apiAuthentication.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(body)),
  };
}

describe("createAuthenticationApi", () => {
  const api = createAuthenticationApi("example.auth0.com", "client_id", "client_secret");

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("getToken", () => {
    it("posts to /oauth/token with client credentials grant", async () => {
      mockFetch.mockResolvedValue(makeResponse({ access_token: "tok" }));

      await api.getToken("https://example.auth0.com/api/v2/");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.auth0.com/oauth/token",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("throws when the response is not ok", async () => {
      mockFetch.mockResolvedValue(makeResponse({ message: "Unauthorized" }, false, 401));

      await expect(api.getToken("https://example.auth0.com/api/v2/")).rejects.toThrow(
        "Unauthorized"
      );
    });
  });

  describe("verifyOobCode", () => {
    it("posts to /oauth/token with mfa-oob grant", async () => {
      mockFetch.mockResolvedValue(makeResponse({ access_token: "tok" }));

      await api.verifyOobCode("mfa_token", "oob_code", "binding_code");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.auth0.com/oauth/token",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("exchangeCodeForToken", () => {
    it("posts to /oauth/token with authorization_code grant", async () => {
      mockFetch.mockResolvedValue(makeResponse({ access_token: "tok" }));

      await api.exchangeCodeForToken("auth_code", "https://example.com/callback");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.auth0.com/oauth/token",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("includes code_verifier in the body when provided", async () => {
      mockFetch.mockResolvedValue(makeResponse({ access_token: "tok" }));

      await api.exchangeCodeForToken(
        "auth_code",
        "https://example.com/callback",
        "my-verifier"
      );

      const sentBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(sentBody.code_verifier).toBe("my-verifier");
    });

    it("omits code_verifier when not provided", async () => {
      mockFetch.mockResolvedValue(makeResponse({ access_token: "tok" }));

      await api.exchangeCodeForToken("auth_code", "https://example.com/callback");

      const sentBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(sentBody).not.toHaveProperty("code_verifier");
    });
  });

  describe("changePassword", () => {
    it("posts to /dbconnections/change_password", async () => {
      mockFetch.mockResolvedValue(
        makeResponse("We've just sent you an email", true, 200)
      );

      await api.changePassword("Username-Password-Authentication", "user@example.com");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.auth0.com/dbconnections/change_password",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("throws when the response is not ok", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad request"),
      });

      await expect(
        api.changePassword("Username-Password-Authentication", "bad")
      ).rejects.toThrow("Failed to change password");
    });
  });

  describe("startPasswordless", () => {
    it("posts to /passwordless/start with email connection", async () => {
      mockFetch.mockResolvedValue(makeResponse({ _id: "abc" }));

      await api.startPasswordless("email", "code", "user@example.com");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.auth0.com/passwordless/start",
        expect.objectContaining({ method: "POST" })
      );
      const sentBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(sentBody).toMatchObject({
        connection: "email",
        send: "code",
        email: "user@example.com",
      });
      expect(sentBody).not.toHaveProperty("phone_number");
    });

    it("posts to /passwordless/start with sms connection", async () => {
      mockFetch.mockResolvedValue(makeResponse({ _id: "abc" }));

      await api.startPasswordless("sms", "code", "+15551234567");

      const sentBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(sentBody).toMatchObject({
        connection: "sms",
        send: "code",
        phone_number: "+15551234567",
      });
      expect(sentBody).not.toHaveProperty("email");
    });

    it("includes authParams when provided", async () => {
      mockFetch.mockResolvedValue(makeResponse({ _id: "abc" }));

      await api.startPasswordless("email", "link", "user@example.com", {
        redirect_uri: "https://example.com",
      });

      const sentBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(sentBody.authParams).toEqual({ redirect_uri: "https://example.com" });
    });

    it("throws when the response is not ok", async () => {
      mockFetch.mockResolvedValue(
        makeResponse({ message: "Bad connection" }, false, 400)
      );

      await expect(
        api.startPasswordless("email", "code", "user@example.com")
      ).rejects.toThrow("Bad connection");
    });
  });
});
