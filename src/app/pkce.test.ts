import { describe, expect, it } from "vitest";

import { generatePkce } from "./pkce.js";

describe("generatePkce", () => {
  it("returns a verifier and challenge", () => {
    const { verifier, challenge } = generatePkce();
    expect(typeof verifier).toBe("string");
    expect(typeof challenge).toBe("string");
  });

  it("returns base64url-encoded values with no padding or invalid chars", () => {
    const { verifier, challenge } = generatePkce();
    const base64urlPattern = /^[A-Za-z0-9\-_]+$/;
    expect(verifier).toMatch(base64urlPattern);
    expect(challenge).toMatch(base64urlPattern);
  });

  it("returns a different verifier on each call", () => {
    const first = generatePkce();
    const second = generatePkce();
    expect(first.verifier).not.toBe(second.verifier);
  });
});
