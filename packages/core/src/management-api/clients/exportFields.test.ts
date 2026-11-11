import { describe, expect, it } from "vitest";
import { promoteDeprecatedCrossOriginAuth } from "./exportFields.js";

describe("promoteDeprecatedCrossOriginAuth", () => {
  it("carries the deprecated field's value onto the current field name when that's missing", () => {
    expect(promoteDeprecatedCrossOriginAuth({ cross_origin_auth: true })).toEqual({
      cross_origin_auth: true,
      cross_origin_authentication: true,
    });
  });

  it("leaves the current field alone when both are already present", () => {
    expect(
      promoteDeprecatedCrossOriginAuth({
        cross_origin_auth: true,
        cross_origin_authentication: false,
      })
    ).toEqual({ cross_origin_auth: true, cross_origin_authentication: false });
  });

  it("does nothing when the deprecated field isn't present", () => {
    const client = { name: "My App" };
    expect(promoteDeprecatedCrossOriginAuth(client)).toEqual(client);
  });
});
