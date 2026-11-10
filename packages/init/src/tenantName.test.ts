import { describe, expect, it } from "vitest";
import { isValidTenantName, pickDefaultTenantName } from "./tenantName.js";

describe("isValidTenantName", () => {
  it.each(["demo", "acme", "acme-2", "acme_corp"])("accepts %s", (value) => {
    expect(isValidTenantName(value)).toBe(true);
  });

  it.each(["", "acme/corp", "acme\\corp", "../acme", "acme corp"])(
    "rejects %s",
    (value) => {
      expect(isValidTenantName(value)).toBe(false);
    }
  );
});

describe("pickDefaultTenantName", () => {
  it("suggests the plain default when nothing else exists yet", () => {
    expect(pickDefaultTenantName([])).toBe("demo");
  });

  it("suggests the plain default when it isn't already taken", () => {
    expect(pickDefaultTenantName(["acme"])).toBe("demo");
  });

  it("suggests a numbered variant when the default is already taken", () => {
    expect(pickDefaultTenantName(["demo"])).toBe("demo-2");
    expect(pickDefaultTenantName(["demo", "demo-2"])).toBe("demo-3");
  });
});
