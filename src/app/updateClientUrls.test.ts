import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildAppUrls, resolveBaseUrl, updateAllClientUrls } from "./updateClientUrls.js";
import type { Auth0Client } from "../types.js";

const testDir = "./test-tenant-updateurls";

const clientFixture: Auth0Client = {
  client_id: "abc123",
  name: "Test App",
  app_type: "regular_web",
  grant_types: ["authorization_code"],
  token_endpoint_auth_method: "client_secret_post",
  callbacks: ["https://existing.com/callback"],
  allowed_logout_urls: ["https://existing.com"],
  allowed_origins: ["https://existing.com"],
};

beforeEach(() => {
  mkdirSync(join(testDir, "clients"), { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("resolveBaseUrl", () => {
  it("uses DEPLOYED_APP_URL when set", () => {
    expect(resolveBaseUrl({ DEPLOYED_APP_URL: "https://myapp.onrender.com" })).toBe(
      "https://myapp.onrender.com"
    );
  });

  it("strips trailing slash from DEPLOYED_APP_URL", () => {
    expect(resolveBaseUrl({ DEPLOYED_APP_URL: "https://myapp.onrender.com/" })).toBe(
      "https://myapp.onrender.com"
    );
  });

  it("uses PORT when DEPLOYED_APP_URL is not set", () => {
    expect(resolveBaseUrl({ PORT: "4000" })).toBe("http://localhost:4000");
  });

  it("defaults to port 3000 when neither DEPLOYED_APP_URL nor PORT is set", () => {
    expect(resolveBaseUrl({})).toBe("http://localhost:3000");
  });
});

describe("buildAppUrls", () => {
  it("builds correct callback, logout, and origin URLs", () => {
    const urls = buildAppUrls("http://localhost:3000", "abc123");
    expect(urls.callbackUrl).toBe("http://localhost:3000/callback/abc123");
    expect(urls.logoutUrl).toBe("http://localhost:3000");
    expect(urls.origin).toBe("http://localhost:3000");
  });
});

describe("updateAllClientUrls", () => {
  it("adds app URLs to all client files and returns true", () => {
    writeFileSync(
      join(testDir, "clients", "Test App.json"),
      JSON.stringify(clientFixture)
    );

    const changed = updateAllClientUrls(testDir, "http://localhost:3000");
    expect(changed).toBe(true);

    const updated = JSON.parse(
      readFileSync(join(testDir, "clients", "Test App.json"), "utf-8")
    ) as Auth0Client;

    expect(updated.callbacks).toContain("http://localhost:3000/callback/abc123");
    expect(updated.allowed_logout_urls).toContain("http://localhost:3000");
    expect(updated.allowed_origins).toContain("http://localhost:3000");
  });

  it("returns false when no changes are needed", () => {
    const clientWithExistingUrls = {
      ...clientFixture,
      callbacks: ["http://localhost:3000/callback/abc123"],
      allowed_logout_urls: ["http://localhost:3000"],
      allowed_origins: ["http://localhost:3000"],
    };
    writeFileSync(
      join(testDir, "clients", "Test App.json"),
      JSON.stringify(clientWithExistingUrls, null, 2) + "\n"
    );

    const changed = updateAllClientUrls(testDir, "http://localhost:3000");
    expect(changed).toBe(false);
  });

  it("does not duplicate URLs that already exist", () => {
    const clientWithExisting = {
      ...clientFixture,
      callbacks: ["http://localhost:3000/callback/abc123"],
      allowed_logout_urls: ["http://localhost:3000"],
      allowed_origins: ["http://localhost:3000"],
    };
    writeFileSync(
      join(testDir, "clients", "Test App.json"),
      JSON.stringify(clientWithExisting)
    );

    updateAllClientUrls(testDir, "http://localhost:3000");

    const updated = JSON.parse(
      readFileSync(join(testDir, "clients", "Test App.json"), "utf-8")
    ) as Auth0Client;

    expect(
      updated.callbacks.filter((u) => u === "http://localhost:3000/callback/abc123")
    ).toHaveLength(1);
  });

  it("skips non_interactive clients", () => {
    const nonInteractiveClient = {
      ...clientFixture,
      app_type: "non_interactive",
      grant_types: ["client_credentials"],
      callbacks: [],
      allowed_logout_urls: [],
      allowed_origins: [],
    };
    writeFileSync(
      join(testDir, "clients", "M2M App.json"),
      JSON.stringify(nonInteractiveClient)
    );

    updateAllClientUrls(testDir, "http://localhost:3000");

    const unchanged = JSON.parse(
      readFileSync(join(testDir, "clients", "M2M App.json"), "utf-8")
    ) as Auth0Client;

    expect(unchanged.callbacks).toHaveLength(0);
    expect(unchanged.allowed_logout_urls).toHaveLength(0);
    expect(unchanged.allowed_origins).toHaveLength(0);
  });

  it("preserves existing URLs alongside new ones", () => {
    writeFileSync(
      join(testDir, "clients", "Test App.json"),
      JSON.stringify(clientFixture)
    );

    updateAllClientUrls(testDir, "http://localhost:3000");

    const updated = JSON.parse(
      readFileSync(join(testDir, "clients", "Test App.json"), "utf-8")
    ) as Auth0Client;

    expect(updated.callbacks).toContain("https://existing.com/callback");
    expect(updated.callbacks).toContain("http://localhost:3000/callback/abc123");
  });
});
