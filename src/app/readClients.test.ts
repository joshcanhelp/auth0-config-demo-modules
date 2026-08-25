import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readClients } from "./readClients.js";
import type { Auth0Client } from "../types.js";

const testDir = "./test-tenant-readclients";

const clientFixture: Auth0Client = {
  client_id: "abc123",
  name: "Test App",
  app_type: "regular_web",
  grant_types: ["authorization_code"],
  token_endpoint_auth_method: "client_secret_post",
  callbacks: [],
  allowed_logout_urls: [],
  allowed_origins: [],
};

beforeEach(() => {
  mkdirSync(join(testDir, "clients"), { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("readClients", () => {
  it("reads all JSON files from the clients directory", () => {
    writeFileSync(
      join(testDir, "clients", "App One.json"),
      JSON.stringify(clientFixture)
    );

    const clients = readClients(testDir);

    expect(clients).toHaveLength(1);
    expect(clients[0].client_id).toBe("abc123");
    expect(clients[0].name).toBe("Test App");
  });

  it("reads multiple client files", () => {
    writeFileSync(
      join(testDir, "clients", "App One.json"),
      JSON.stringify({ ...clientFixture, client_id: "aaa" })
    );
    writeFileSync(
      join(testDir, "clients", "App Two.json"),
      JSON.stringify({ ...clientFixture, client_id: "bbb" })
    );

    const clients = readClients(testDir);

    expect(clients).toHaveLength(2);
    expect(clients.map((c) => c.client_id)).toEqual(
      expect.arrayContaining(["aaa", "bbb"])
    );
  });

  it("ignores non-JSON files", () => {
    writeFileSync(
      join(testDir, "clients", "App One.json"),
      JSON.stringify(clientFixture)
    );
    writeFileSync(join(testDir, "clients", "README.md"), "ignore me");

    const clients = readClients(testDir);

    expect(clients).toHaveLength(1);
  });
});
