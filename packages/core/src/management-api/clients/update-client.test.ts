import { describe, expect, it } from "vitest";
import { buildUpdateClientRequest } from "./update-client.js";

describe("buildUpdateClientRequest", () => {
  it("strips fields the API sets itself or rejects, so a full local record can be pushed as-is", () => {
    const request = buildUpdateClientRequest("abc123", {
      name: "My App",
      client_id: "abc123",
      encrypted: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(request.body).toEqual({ name: "My App" });
    expect(request.path).toBe("/clients/abc123");
  });

  it("rejects client_secret", () => {
    expect(() =>
      buildUpdateClientRequest("abc123", { name: "My App", client_secret: "x" } as never)
    ).toThrow(/rotate it through the dedicated rotate-secret endpoint/);
  });
});
