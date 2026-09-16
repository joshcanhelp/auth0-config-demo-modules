import { describe, expect, it } from "vitest";

import { getTemplateTypes, getTemplatesForType } from "./templateSelection.js";

const templateNames = [
  "Client > Web Application",
  "Client > M2M Application",
  "Action > Post-Login > Add Custom Claims",
  "Action > Pre-Registration > Testing",
  "Solution > Form > Testing",
  "Grant > Management API > User Management",
];

describe("getTemplateTypes", () => {
  it("returns each type once, in first-appearance order", () => {
    expect(getTemplateTypes(templateNames)).toEqual([
      "Client",
      "Action",
      "Solution",
      "Grant",
    ]);
  });

  it("returns an empty array for an empty list", () => {
    expect(getTemplateTypes([])).toEqual([]);
  });
});

describe("getTemplatesForType", () => {
  it("returns only templates matching the given type", () => {
    const options = getTemplatesForType(templateNames, "Client");
    expect(options).toEqual([
      { label: "Web Application", value: "Client > Web Application" },
      { label: "M2M Application", value: "Client > M2M Application" },
    ]);
  });

  it("strips only the leading type prefix, keeping nested segments", () => {
    const options = getTemplatesForType(templateNames, "Action");
    expect(options).toEqual([
      {
        label: "Post-Login > Add Custom Claims",
        value: "Action > Post-Login > Add Custom Claims",
      },
      {
        label: "Pre-Registration > Testing",
        value: "Action > Pre-Registration > Testing",
      },
    ]);
  });

  it("returns an empty array when no templates match the type", () => {
    expect(getTemplatesForType(templateNames, "Unknown")).toEqual([]);
  });
});
