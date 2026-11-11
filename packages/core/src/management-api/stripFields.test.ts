import { describe, expect, it, vi } from "vitest";
import { stripFields } from "./stripFields.js";

describe("stripFields", () => {
  it("removes only the listed fields that are actually present", () => {
    const result = stripFields({ a: 1, b: 2, c: 3 }, ["a", "c", "missing"], "test");
    expect(result).toEqual({ b: 2 });
  });

  it("doesn't mutate the original object", () => {
    const original = { a: 1, b: 2 };
    stripFields(original, ["a"], "test");
    expect(original).toEqual({ a: 1, b: 2 });
  });

  it("returns an equivalent object when none of the fields are present", () => {
    expect(stripFields({ a: 1 }, ["b"], "test")).toEqual({ a: 1 });
  });

  it("logs each stripped field by default", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    stripFields({ a: 1 }, ["a"], "test");

    expect(logSpy).toHaveBeenCalledOnce();
    logSpy.mockRestore();
  });

  it("logs nothing when quiet is true", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = stripFields({ a: 1 }, ["a"], "test", { quiet: true });

    expect(result).toEqual({});
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
