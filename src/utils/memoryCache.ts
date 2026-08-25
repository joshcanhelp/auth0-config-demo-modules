import type { TokenCache } from "../auth0/clientCredentials.js";

export function createMemoryCache(): TokenCache {
  let stored: { access_token: string; expires_at: number } | null = null;

  return {
    read() {
      if (!stored || Date.now() >= stored.expires_at) return null;
      return stored.access_token;
    },
    write(accessToken, expiresAt) {
      stored = { access_token: accessToken, expires_at: expiresAt };
    },
    clear() {
      stored = null;
    },
  };
}
