import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createManagementApi } from "./apiManagement.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) };
}

describe("createManagementApi", () => {
  const api = createManagementApi("example.auth0.com", "test-token");

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("getUser", () => {
    it("calls the correct endpoint and returns the user", async () => {
      const user = { user_id: "auth0|123", email: "a@example.com" };
      mockFetch.mockResolvedValue(makeResponse(user));

      const result = await api.getUser("auth0|123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.auth0.com/api/v2/users/auth0%7C123",
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
        })
      );
      expect(result).toEqual(user);
    });
  });

  describe("createUser", () => {
    it("throws a Zod error when connection is missing", async () => {
      await expect(api.createUser({ email: "a@example.com" } as never)).rejects.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("posts to /users with the validated body", async () => {
      const user = { user_id: "auth0|new", email: "b@example.com" };
      mockFetch.mockResolvedValue(makeResponse(user));

      const result = await api.createUser({
        connection: "Username-Password-Authentication",
        email: "b@example.com",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.auth0.com/api/v2/users",
        expect.objectContaining({ method: "POST" })
      );
      expect(result).toEqual(user);
    });
  });

  describe("patchUser", () => {
    it("throws a Zod error for an invalid email", async () => {
      await expect(
        api.patchUser("auth0|123", { email: "not-an-email" })
      ).rejects.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("patches the correct endpoint", async () => {
      const user = { user_id: "auth0|123", name: "Updated" };
      mockFetch.mockResolvedValue(makeResponse(user));

      const result = await api.patchUser("auth0|123", { name: "Updated" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.auth0.com/api/v2/users/auth0%7C123",
        expect.objectContaining({ method: "PATCH" })
      );
      expect(result).toEqual(user);
    });
  });

  describe("with tenant userSchema", () => {
    const tenantSchema = z.object({ name: z.string(), email: z.string().email() });
    const apiWithSchema = createManagementApi("example.auth0.com", "test-token", {
      userSchema: tenantSchema,
    });

    it("patchUser validates against the tenant schema", async () => {
      await expect(
        apiWithSchema.patchUser("auth0|123", { email: "bad" })
      ).rejects.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("patchUser accepts partial data even when tenant schema has required fields", async () => {
      const user = { user_id: "auth0|123", name: "Updated" };
      mockFetch.mockResolvedValue(makeResponse(user));

      const result = await apiWithSchema.patchUser("auth0|123", { name: "Updated" });

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toEqual(user);
    });

    it("createUser validates profile fields against tenant schema", async () => {
      await expect(
        apiWithSchema.createUser({ connection: "con", email: "bad" })
      ).rejects.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("createUser still requires connection even with tenant schema", async () => {
      await expect(
        apiWithSchema.createUser({ name: "Alice" } as never)
      ).rejects.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("linkUser", () => {
    it("posts to the identities endpoint with provider and user_id", async () => {
      const identities = [{ provider: "auth0", user_id: "secondary" }];
      mockFetch.mockResolvedValue(makeResponse(identities));

      const result = await api.linkUser("auth0|primary", {
        provider: "auth0",
        user_id: "secondary",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.auth0.com/api/v2/users/auth0%7Cprimary/identities",
        expect.objectContaining({ method: "POST" })
      );
      expect(result).toEqual(identities);
    });

    it("posts to the identities endpoint with link_with JWT", async () => {
      const identities = [{ provider: "google-oauth2", user_id: "secondary" }];
      mockFetch.mockResolvedValue(makeResponse(identities));

      await api.linkUser("auth0|primary", { link_with: "secondary.jwt.token" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.auth0.com/api/v2/users/auth0%7Cprimary/identities",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("error handling", () => {
    it("throws when the API returns a non-ok response", async () => {
      mockFetch.mockResolvedValue(
        makeResponse({ message: "User not found" }, false, 404)
      );

      await expect(api.getUser("auth0|missing")).rejects.toThrow("User not found");
    });
  });
});
