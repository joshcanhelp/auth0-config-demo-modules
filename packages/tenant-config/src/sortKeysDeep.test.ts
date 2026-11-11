import { describe, expect, it } from "vitest";
import { sortKeysDeep } from "./sortKeysDeep.js";

describe("sortKeysDeep", () => {
  it("sorts top-level keys alphabetically", () => {
    const result = sortKeysDeep({ name: "x", client_id: "abc", app_type: "spa" });
    expect(Object.keys(result as object)).toEqual(["app_type", "client_id", "name"]);
  });

  it("sorts keys in nested objects too", () => {
    const result = sortKeysDeep({
      name: "x",
      refresh_token: { rotation_type: "rotating", expiration_type: "expiring" },
    });
    expect(Object.keys(result as object)).toEqual(["name", "refresh_token"]);
    expect(Object.keys((result as { refresh_token: object }).refresh_token)).toEqual([
      "expiration_type",
      "rotation_type",
    ]);
  });

  it("preserves array element order, while sorting keys of objects inside an array", () => {
    const result = sortKeysDeep({
      identities: [
        { connection: "db", provider: "auth0" },
        { connection: "google", provider: "google-oauth2" },
      ],
    });
    expect(result).toEqual({
      identities: [
        { connection: "db", provider: "auth0" },
        { connection: "google", provider: "google-oauth2" },
      ],
    });
  });

  it("leaves primitives and null untouched", () => {
    expect(sortKeysDeep("x")).toBe("x");
    expect(sortKeysDeep(5)).toBe(5);
    expect(sortKeysDeep(null)).toBeNull();
  });
});
