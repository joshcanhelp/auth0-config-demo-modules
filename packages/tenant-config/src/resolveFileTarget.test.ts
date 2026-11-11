import { describe, expect, it } from "vitest";
import { resolveFileTarget } from "./resolveFileTarget.js";

const TENANTS_ROOT = "/project/tenants";

describe("resolveFileTarget", () => {
  it("splits a tenant/entity/file path into its parts", () => {
    expect(
      resolveFileTarget(`${TENANTS_ROOT}/my-tenant/clients/My App.json`, TENANTS_ROOT)
    ).toEqual({ tenantName: "my-tenant", entityName: "clients", baseFileName: "My App" });
  });

  it("throws when the path isn't a .json file", () => {
    expect(() =>
      resolveFileTarget(`${TENANTS_ROOT}/my-tenant/clients/My App.txt`, TENANTS_ROOT)
    ).toThrow(/must point to a \.json file/);
  });

  it("throws when the path isn't directly inside a tenant's entity directory", () => {
    expect(() =>
      resolveFileTarget(
        `${TENANTS_ROOT}/my-tenant/clients/nested/My App.json`,
        TENANTS_ROOT
      )
    ).toThrow(/tenants\/<tenant>\/<entity>\/<file>\.json/);
  });

  it("throws when the path is outside the tenants root", () => {
    expect(() =>
      resolveFileTarget("/project/other/my-tenant/clients/My App.json", TENANTS_ROOT)
    ).toThrow(/tenants\/<tenant>\/<entity>\/<file>\.json/);
  });
});
