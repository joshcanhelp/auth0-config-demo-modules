import { describe, expect, it } from "vitest";

import { parseSelection } from "./selectPrompt.js";

const options = [
  { label: "clients", value: "clients" },
  { label: "prompts", value: "prompts" },
  { label: "branding", value: "branding" },
];

describe("parseSelection", () => {
  it("returns the value for each valid 1-based index", () => {
    expect(parseSelection("1", options)).toBe("clients");
    expect(parseSelection("2", options)).toBe("prompts");
    expect(parseSelection("3", options)).toBe("branding");
  });

  it("returns null for index 0", () => {
    expect(parseSelection("0", options)).toBeNull();
  });

  it("returns null for an index beyond the list", () => {
    expect(parseSelection("4", options)).toBeNull();
  });

  it("returns null for non-numeric input", () => {
    expect(parseSelection("abc", options)).toBeNull();
    expect(parseSelection("", options)).toBeNull();
  });

  it("handles whitespace around the answer", () => {
    expect(parseSelection("  2  ", options)).toBe("prompts");
  });
});
