import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readTenantConfig } from "./readTenantConfig.js";

const testDir = "./test-tenant-readconfig";

beforeEach(() => {
  mkdirSync(join(testDir, "custom-domains"), { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("readTenantConfig", () => {
  it("throws if TENANT_DOMAIN is missing", () => {
    expect(() => readTenantConfig(testDir, {})).toThrow("TENANT_DOMAIN");
  });

  it("uses tenantDomain as loginDomain when no custom domains file exists", () => {
    const config = readTenantConfig(testDir, { TENANT_DOMAIN: "test.us.auth0.com" });

    expect(config.tenantDomain).toBe("test.us.auth0.com");
    expect(config.loginDomain).toBe("test.us.auth0.com");
    expect(config.customDomains).toEqual([]);
  });

  it("uses tenantDomain as loginDomain when no primary ready custom domain exists", () => {
    writeFileSync(
      join(testDir, "custom-domains", "custom-domains.json"),
      JSON.stringify([
        { domain: "login.example.com", primary: true, status: "pending_verification" },
      ])
    );

    const config = readTenantConfig(testDir, { TENANT_DOMAIN: "test.us.auth0.com" });

    expect(config.loginDomain).toBe("test.us.auth0.com");
    expect(config.customDomains).toEqual([]);
  });

  it("uses friendly_name from tenant.json when present", () => {
    writeFileSync(
      join(testDir, "tenant.json"),
      JSON.stringify({ friendly_name: "My Tenant" })
    );

    const config = readTenantConfig(testDir, { TENANT_DOMAIN: "test.us.auth0.com" });

    expect(config.friendlyName).toBe("My Tenant");
  });

  it("falls back to tenantDomain when tenant.json has no friendly_name", () => {
    const config = readTenantConfig(testDir, { TENANT_DOMAIN: "test.us.auth0.com" });

    expect(config.friendlyName).toBe("test.us.auth0.com");
  });

  it("uses custom domain as loginDomain when primary and ready", () => {
    writeFileSync(
      join(testDir, "custom-domains", "custom-domains.json"),
      JSON.stringify([{ domain: "login.example.com", is_default: true, status: "ready" }])
    );

    const config = readTenantConfig(testDir, { TENANT_DOMAIN: "test.us.auth0.com" });

    expect(config.tenantDomain).toBe("test.us.auth0.com");
    expect(config.loginDomain).toBe("login.example.com");
    expect(config.customDomains).toEqual(["login.example.com"]);
  });

  it("returns all ready custom domains with default first", () => {
    writeFileSync(
      join(testDir, "custom-domains", "custom-domains.json"),
      JSON.stringify([
        { domain: "login2.example.com", is_default: false, status: "ready" },
        { domain: "login.example.com", is_default: true, status: "ready" },
        {
          domain: "login3.example.com",
          is_default: false,
          status: "pending_verification",
        },
      ])
    );

    const config = readTenantConfig(testDir, { TENANT_DOMAIN: "test.us.auth0.com" });

    expect(config.loginDomain).toBe("login.example.com");
    expect(config.customDomains).toEqual(["login.example.com", "login2.example.com"]);
  });
});
