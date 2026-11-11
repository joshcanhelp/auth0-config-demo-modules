import { describe, expect, it } from "vitest";
import { applyDefault, parseSelection, type SelectOption } from "./prompts.js";

describe("applyDefault", () => {
  it("falls back to the default when the answer is empty", () => {
    expect(applyDefault("", "demo")).toBe("demo");
  });

  it("keeps an empty answer as-is when there's no default", () => {
    expect(applyDefault("", undefined)).toBe("");
  });

  it("keeps a non-empty answer even when a default is given", () => {
    expect(applyDefault("acme", "demo")).toBe("acme");
  });
});

describe("parseSelection", () => {
  const options: SelectOption<string>[] = [
    { label: "One", value: "one" },
    { label: "Two", value: "two" },
  ];

  it("returns the matching option for a valid 1-based index", () => {
    expect(parseSelection("1", options)).toBe("one");
    expect(parseSelection(" 2 ", options)).toBe("two");
  });

  it("returns null for an out-of-range or non-numeric answer", () => {
    expect(parseSelection("0", options)).toBeNull();
    expect(parseSelection("3", options)).toBeNull();
    expect(parseSelection("abc", options)).toBeNull();
  });
});
