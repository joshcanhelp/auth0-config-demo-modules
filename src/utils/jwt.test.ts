import { describe, expect, it } from "vitest";

import { decodeJwtPayload } from "./jwt.js";

describe("decodeJwtPayload", () => {
  it("decodes a JWT payload", () => {
    const payload = { sub: "user123", email: "user@example.com" };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const token = `header.${encoded}.signature`;

    const decoded = decodeJwtPayload(token);
    expect(decoded).toEqual(payload);
  });
});
