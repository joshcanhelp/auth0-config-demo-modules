import { describe, expect, it, vi } from "vitest";
import type { ManagementApiClient } from "../api-client.js";
import { createClientsNamespace } from "./index.js";

const rawClient = {
  client_id: "abc123",
  name: "My App",
  client_secret: "super-secret",
  signing_keys: [{ cert: "-----BEGIN CERTIFICATE-----..." }],
  global: false,
  tenant: "my-tenant",
  cross_origin_auth: false,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-02-01T00:00:00.000Z",
};

function createFakeClient(response: unknown): ManagementApiClient {
  return { request: vi.fn().mockResolvedValue(response) };
}

describe("createClientsNamespace", () => {
  it("strips live secrets and read-only fields from get(), but keeps created_at/updated_at", async () => {
    const clients = createClientsNamespace(createFakeClient(rawClient));

    const result = await clients.get("abc123");

    expect(result).toEqual({
      client_id: "abc123",
      name: "My App",
      cross_origin_authentication: false,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-02-01T00:00:00.000Z",
    });
  });

  it("strips the same fields from every client returned by list()", async () => {
    const clients = createClientsNamespace(createFakeClient([rawClient]));

    const result = await clients.list();

    expect(result).toEqual([
      {
        client_id: "abc123",
        name: "My App",
        cross_origin_authentication: false,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-02-01T00:00:00.000Z",
      },
    ]);
  });

  it("preserves a cross_origin_auth-only client's setting under cross_origin_authentication", async () => {
    const clients = createClientsNamespace(
      createFakeClient({ client_id: "abc123", name: "My App", cross_origin_auth: true })
    );

    const result = await clients.get("abc123");

    expect(result).toEqual({
      client_id: "abc123",
      name: "My App",
      cross_origin_authentication: true,
    });
  });

  it("excludes the tenant's global client by default", async () => {
    const request = vi.fn().mockResolvedValue([]);
    const clients = createClientsNamespace({ request });

    await clients.list();

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ is_global: false }) })
    );
  });

  it("lets an explicit is_global override the default", async () => {
    const request = vi.fn().mockResolvedValue([]);
    const clients = createClientsNamespace({ request });

    await clients.list({ is_global: true });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ is_global: true }) })
    );
  });

  describe("scopes", () => {
    it("skips the check on every method when scopes is omitted", async () => {
      const request = vi.fn().mockResolvedValue(rawClient);
      const clients = createClientsNamespace({ request });

      await expect(clients.get("abc123")).resolves.toBeDefined();
      await expect(clients.create({ name: "x" })).resolves.toBeDefined();
      await expect(clients.update("abc123", { name: "x" })).resolves.toBeDefined();
      await expect(clients.delete("abc123")).resolves.toBeDefined();
    });

    it("rejects each method when the given scopes are missing what it needs", async () => {
      const clients = createClientsNamespace({ request: vi.fn() });

      await expect(clients.get("abc123", undefined, [])).rejects.toThrow(
        "Missing required scope: read:clients"
      );
      await expect(clients.create({ name: "x" }, [])).rejects.toThrow(
        "Missing required scope: create:clients"
      );
      await expect(clients.update("abc123", { name: "x" }, [])).rejects.toThrow(
        "Missing required scope: update:clients"
      );
      await expect(clients.delete("abc123", [])).rejects.toThrow(
        "Missing required scope: delete:clients"
      );
    });

    it("succeeds when the given scopes include what's needed", async () => {
      const request = vi.fn().mockResolvedValue(rawClient);
      const clients = createClientsNamespace({ request });

      await expect(
        clients.get("abc123", undefined, ["read:clients"])
      ).resolves.toBeDefined();
    });
  });
});
