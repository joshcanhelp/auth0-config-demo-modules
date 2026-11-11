import { describe, expect, it } from "vitest";
import { ENTITY_REGISTRY, findEntityDefinition } from "./entityRegistry.js";

describe("findEntityDefinition", () => {
  it("finds a registered entity by name", () => {
    expect(findEntityDefinition("clients")).toBe(ENTITY_REGISTRY[0]);
  });

  it("returns undefined for an unregistered entity name", () => {
    expect(findEntityDefinition("connections")).toBeUndefined();
  });
});
