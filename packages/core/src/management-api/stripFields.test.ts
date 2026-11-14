import { afterEach, describe, expect, it, vi } from "vitest";
import { stripFields } from "./stripFields.js";

describe("stripFields", () => {
  const originalAuthZeroLog = process.env.AUTH0_LOG;

  afterEach(() => {
    if (originalAuthZeroLog === undefined) {
      delete process.env.AUTH0_LOG;
    } else {
      process.env.AUTH0_LOG = originalAuthZeroLog;
    }
  });

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

  it("logs nothing by default (AUTH0_LOG not set to debug)", () => {
    delete process.env.AUTH0_LOG;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    stripFields({ a: 1 }, ["a"], "test");

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("logs each stripped field when AUTH0_LOG=debug", () => {
    process.env.AUTH0_LOG = "debug";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    stripFields({ a: 1 }, ["a"], "test");

    expect(logSpy).toHaveBeenCalledOnce();
    logSpy.mockRestore();
  });
});
