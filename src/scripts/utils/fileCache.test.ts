import { rmSync, writeFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

import { createFileCache } from "./fileCache.js";

const cacheFile = "./test-management-token.json";
const futureExpiry = Date.now() + 60_000;

function writeCacheFile(entry: object) {
  writeFileSync(cacheFile, JSON.stringify(entry, null, 2) + "\n");
}

afterEach(() => {
  rmSync(cacheFile, { force: true });
});

describe("createFileCache", () => {
  it("returns null when the cache file does not exist", () => {
    expect(createFileCache(cacheFile).read()).toBeNull();
  });

  it("returns the token for a valid, unexpired cache entry", () => {
    writeCacheFile({ access_token: "tok", expires_at: futureExpiry });
    expect(createFileCache(cacheFile).read()).toBe("tok");
  });

  it("returns null when the token is expired", () => {
    writeCacheFile({ access_token: "tok", expires_at: Date.now() - 1000 });
    expect(createFileCache(cacheFile).read()).toBeNull();
  });

  it("writes the token with expiry", () => {
    const cache = createFileCache(cacheFile);
    cache.write("new-tok", futureExpiry);
    expect(cache.read()).toBe("new-tok");
  });

  it("clear makes a subsequent read return null", () => {
    const cache = createFileCache(cacheFile);
    cache.write("tok", futureExpiry);
    cache.clear();
    expect(cache.read()).toBeNull();
  });

  it("clear does not throw when the file does not exist", () => {
    expect(() => createFileCache(cacheFile).clear()).not.toThrow();
  });
});
