import { readFileSync, writeFileSync, unlinkSync } from "node:fs";

import type { TokenCache } from "../../auth0/clientCredentials.js";

interface CacheEntry {
  access_token: string;
  expires_at: number;
}

export function createFileCache(cacheFile: string): TokenCache {
  return {
    read() {
      try {
        const { access_token, expires_at } = JSON.parse(
          readFileSync(cacheFile, "utf-8")
        ) as CacheEntry;
        return expires_at > Date.now() ? access_token : null;
      } catch {
        return null;
      }
    },
    write(accessToken, expiresAt) {
      writeFileSync(
        cacheFile,
        JSON.stringify({ access_token: accessToken, expires_at: expiresAt }, null, 2) + "\n"
      );
    },
    clear() {
      try {
        unlinkSync(cacheFile);
      } catch {
        // file may not exist
      }
    },
  };
}
