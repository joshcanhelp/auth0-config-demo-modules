import { describe, expect, it } from "vitest";
import { requireScopes } from "./requireScopes.js";

describe("requireScopes", () => {
  it("does nothing when availableScopes is undefined", () => {
    expect(() => requireScopes(["create:clients"], undefined)).not.toThrow();
  });

  it("does nothing when every required scope is present", () => {
    expect(() =>
      requireScopes(["create:clients"], ["read:clients", "create:clients"])
    ).not.toThrow();
  });

  it("throws naming the single missing scope", () => {
    expect(() => requireScopes(["create:clients"], ["read:clients"])).toThrow(
      "Missing required scope: create:clients"
    );
  });

  it("throws naming every missing scope", () => {
    expect(() => requireScopes(["create:clients", "update:clients"], [])).toThrow(
      "Missing required scopes: create:clients, update:clients"
    );
  });
});
