import { describe, expect, it } from "vitest";

import { createMemoryCache } from "./memoryCache.js";

describe("createMemoryCache", () => {
  it("returns null when empty", () => {
    const cache = createMemoryCache();
    expect(cache.read()).toBeNull();
  });

  it("returns the stored token before expiry", () => {
    const cache = createMemoryCache();
    cache.write("token123", Date.now() + 60_000);
    expect(cache.read()).toBe("token123");
  });

  it("returns null after expiry", () => {
    const cache = createMemoryCache();
    cache.write("token123", Date.now() - 1);
    expect(cache.read()).toBeNull();
  });

  it("returns null after clear", () => {
    const cache = createMemoryCache();
    cache.write("token123", Date.now() + 60_000);
    cache.clear();
    expect(cache.read()).toBeNull();
  });
});
