import { describe, expect, it } from "vitest";
import { isTenantType } from "./tenantType.js";

describe("isTenantType", () => {
  it.each(["PUSH", "PULL"])("accepts %s", (value) => {
    expect(isTenantType(value)).toBe(true);
  });

  it.each(["push", "pull", "", "READ", "PUSH "])("rejects %s", (value) => {
    expect(isTenantType(value)).toBe(false);
  });
});
