import { describe, expect, it } from "vitest";
import type { ExistingTenant } from "auth0-config-demo-modules/packages/core/src/index.js";
import { pickTenantName } from "./bootstrapTenant.js";

const tenants: ExistingTenant[] = [
  { name: "acme", env: {} },
  { name: "other", env: {} },
];

describe("pickTenantName", () => {
  it("returns the explicit name when it matches an existing tenant", () => {
    expect(pickTenantName(tenants, "other")).toBe("other");
  });

  it("throws when the explicit name doesn't match any existing tenant", () => {
    expect(() => pickTenantName(tenants, "missing")).toThrow(/No tenant directory found/);
  });

  it("auto-picks the only tenant when none was given", () => {
    expect(pickTenantName([tenants[0]])).toBe("acme");
  });

  it("returns null to signal a prompt is needed when multiple tenants exist and none was given", () => {
    expect(pickTenantName(tenants)).toBeNull();
  });

  it("throws when no tenant directories exist at all", () => {
    expect(() => pickTenantName([])).toThrow(/No tenant directories found/);
  });
});
