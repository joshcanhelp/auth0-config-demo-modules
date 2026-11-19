import { existsSync, readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadTenantConfigFile, mergeTenantConfig } from "./tenantConfigFile.js";

vi.mock("node:fs", () => ({ existsSync: vi.fn(), readFileSync: vi.fn() }));

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mergeTenantConfig", () => {
  it("keeps shared keys the tenant doesn't define", () => {
    expect(mergeTenantConfig({ a: 1, b: 2 }, { a: 3 })).toEqual({ a: 3, b: 2 });
  });

  it("replaces an array wholesale rather than concatenating it", () => {
    expect(
      mergeTenantConfig(
        { validate: { skipCodes: ["a", "b"] } },
        { validate: { skipCodes: ["c"] } }
      )
    ).toEqual({ validate: { skipCodes: ["c"] } });
  });

  it("merges a nested object one level deeper instead of replacing it wholesale", () => {
    expect(
      mergeTenantConfig(
        { validate: { skipCodes: ["a"], skipInstances: { code1: ["x"] } } },
        { validate: { skipCodes: ["b"] } }
      )
    ).toEqual({ validate: { skipCodes: ["b"], skipInstances: { code1: ["x"] } } });
  });

  it("recurses as far as the shared object goes", () => {
    expect(
      mergeTenantConfig(
        { validate: { skipInstances: { code1: ["x"], code2: ["y"] } } },
        { validate: { skipInstances: { code1: ["z"] } } }
      )
    ).toEqual({ validate: { skipInstances: { code1: ["z"], code2: ["y"] } } });
  });

  it("treats a non-object value as a plain replacement even if the other side is an object", () => {
    expect(
      mergeTenantConfig({ validate: { skipCodes: ["a"] } }, { validate: "oops" })
    ).toEqual({ validate: "oops" });
  });
});

describe("loadTenantConfigFile", () => {
  it("returns an empty object when neither file exists", () => {
    mockExistsSync.mockReturnValue(false);
    expect(loadTenantConfigFile("./tenants/example", "./tenants")).toEqual({});
  });

  it("returns the tenant file's config when only it exists", () => {
    mockExistsSync.mockImplementation((p) => String(p).includes("example"));
    mockReadFileSync.mockReturnValue(JSON.stringify({ validate: { skipCodes: ["a"] } }));

    expect(loadTenantConfigFile("./tenants/example", "./tenants")).toEqual({
      validate: { skipCodes: ["a"] },
    });
  });

  it("merges the shared file under the tenant file, tenant keys winning", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((p) =>
      String(p).includes("example")
        ? JSON.stringify({ validate: { skipCodes: ["tenant-only"] } })
        : JSON.stringify({
            validate: { skipCodes: ["shared"], skipInstances: { code1: ["x"] } },
          })
    );

    expect(loadTenantConfigFile("./tenants/example", "./tenants")).toEqual({
      validate: { skipCodes: ["tenant-only"], skipInstances: { code1: ["x"] } },
    });
  });

  it("warns and ignores a file with invalid JSON", () => {
    mockExistsSync.mockImplementation((p) => String(p).includes("example"));
    mockReadFileSync.mockReturnValue("not json");

    expect(loadTenantConfigFile("./tenants/example", "./tenants")).toEqual({});
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("not valid JSON"));
  });

  it("warns and ignores a file whose top level isn't an object", () => {
    mockExistsSync.mockImplementation((p) => String(p).includes("example"));
    mockReadFileSync.mockReturnValue(JSON.stringify(["not", "an", "object"]));

    expect(loadTenantConfigFile("./tenants/example", "./tenants")).toEqual({});
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("must be a JSON object")
    );
  });
});
