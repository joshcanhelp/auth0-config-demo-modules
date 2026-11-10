import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  isTenantConfigured,
  listTenantDirectories,
  parseEnvValue,
  readTenantEnv,
  setEnvValue,
  writeTenantEnvValue,
} from "./tenantEnv.js";

describe("parseEnvValue", () => {
  it("reads a quoted value", () => {
    expect(
      parseEnvValue(['TENANT_DOMAIN="my-tenant.us.auth0.com"'], "TENANT_DOMAIN")
    ).toBe("my-tenant.us.auth0.com");
  });

  it("reads an unquoted value", () => {
    expect(parseEnvValue(["PORT=3333"], "PORT")).toBe("3333");
  });

  it("returns undefined when the key isn't present", () => {
    expect(parseEnvValue(['TENANT_TYPE="PUSH"'], "TENANT_DOMAIN")).toBeUndefined();
  });
});

describe("setEnvValue", () => {
  it("replaces an existing key's line in place, leaving other lines untouched", () => {
    const lines = ['TENANT_TYPE="PULL"', 'TENANT_DOMAIN="old.auth0.com"', "PORT=3333"];

    expect(setEnvValue(lines, "TENANT_DOMAIN", "new.auth0.com")).toEqual([
      'TENANT_TYPE="PULL"',
      'TENANT_DOMAIN="new.auth0.com"',
      "PORT=3333",
    ]);
  });

  it("appends the key when it isn't already present", () => {
    expect(
      setEnvValue(['TENANT_TYPE="PUSH"'], "TENANT_DOMAIN", "my-tenant.us.auth0.com")
    ).toEqual(['TENANT_TYPE="PUSH"', 'TENANT_DOMAIN="my-tenant.us.auth0.com"']);
  });
});

describe("isTenantConfigured", () => {
  const complete = {
    TENANT_TYPE: "PUSH",
    TENANT_DOMAIN: "x.auth0.com",
    M2M_CLIENT_ID: "abc123",
    M2M_CLIENT_SECRET: "shh",
  };

  it("is true once every value is set", () => {
    expect(isTenantConfigured(complete)).toBe(true);
  });

  it.each([
    "TENANT_TYPE",
    "TENANT_DOMAIN",
    "M2M_CLIENT_ID",
    "M2M_CLIENT_SECRET",
  ] as const)("is false when %s is missing", (key) => {
    const { [key]: _omitted, ...rest } = complete;
    expect(isTenantConfigured(rest)).toBe(false);
  });

  it("is false when tenant type is invalid", () => {
    expect(isTenantConfigured({ ...complete, TENANT_TYPE: "READ_ONLY" })).toBe(false);
  });
});

describe("readTenantEnv / writeTenantEnvValue", () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns an empty env when no .env file exists yet", async () => {
    dir = await mkdtemp(join(tmpdir(), "tenant-env-test-"));

    expect(await readTenantEnv(dir)).toEqual({});
  });

  it("writes a new key and reads it back", async () => {
    dir = await mkdtemp(join(tmpdir(), "tenant-env-test-"));

    await writeTenantEnvValue(dir, "TENANT_TYPE", "PUSH");

    expect(await readTenantEnv(dir)).toEqual({ TENANT_TYPE: "PUSH" });
  });

  it("updates a key without disturbing a previously-written one", async () => {
    dir = await mkdtemp(join(tmpdir(), "tenant-env-test-"));

    await writeTenantEnvValue(dir, "TENANT_TYPE", "PUSH");
    await writeTenantEnvValue(dir, "TENANT_DOMAIN", "my-tenant.us.auth0.com");
    await writeTenantEnvValue(dir, "TENANT_TYPE", "PULL");

    expect(await readTenantEnv(dir)).toEqual({
      TENANT_TYPE: "PULL",
      TENANT_DOMAIN: "my-tenant.us.auth0.com",
    });
  });
});

describe("listTenantDirectories", () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns an empty list when the tenants root doesn't exist yet", async () => {
    dir = await mkdtemp(join(tmpdir(), "tenant-env-test-"));

    expect(await listTenantDirectories(join(dir, "tenants"))).toEqual([]);
  });

  it("lists each tenant directory with its parsed env, ignoring non-directory entries", async () => {
    dir = await mkdtemp(join(tmpdir(), "tenant-env-test-"));
    const tenantsRoot = join(dir, "tenants");
    await mkdir(join(tenantsRoot, "acme"), { recursive: true });
    await writeFile(
      join(tenantsRoot, "acme", ".env"),
      'TENANT_TYPE="PUSH"\nTENANT_DOMAIN="acme.us.auth0.com"\n'
    );
    await mkdir(join(tenantsRoot, "demo"), { recursive: true });
    await writeFile(tenantsRoot + "/not-a-tenant-dir.txt", "x");

    const tenants = await listTenantDirectories(tenantsRoot);

    expect(tenants.sort((a, b) => a.name.localeCompare(b.name))).toEqual([
      {
        name: "acme",
        env: { TENANT_TYPE: "PUSH", TENANT_DOMAIN: "acme.us.auth0.com" },
      },
      { name: "demo", env: {} },
    ]);
  });
});
