import { describe, expect, it } from "vitest";
import { buildCreateClientRequest } from "./create-client.js";

describe("buildCreateClientRequest", () => {
  it("strips fields the API sets itself or rejects, so a copied/pulled file can be reused as a template", () => {
    const request = buildCreateClientRequest({
      name: "My App",
      client_id: "should-never-be-sent",
      encrypted: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(request.body).toEqual({ name: "My App" });
  });

  it("rejects client_secret", () => {
    expect(() =>
      buildCreateClientRequest({ name: "My App", client_secret: "x" } as never)
    ).toThrow(/rotate it through the dedicated rotate-secret endpoint/);
  });
});
