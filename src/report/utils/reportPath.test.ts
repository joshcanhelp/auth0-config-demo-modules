import { describe, expect, it } from "vitest";

import { formatReportTimestamp, resolveReportPath } from "./reportPath.js";

describe("formatReportTimestamp", () => {
  it("pads single-digit month, day, hour, minute, and second", () => {
    const date = new Date(2026, 0, 5, 3, 7, 9);
    expect(formatReportTimestamp(date)).toBe("2026-01-05T03-07-09");
  });

  it("does not pad double-digit values", () => {
    const date = new Date(2026, 10, 22, 16, 45, 30);
    expect(formatReportTimestamp(date)).toBe("2026-11-22T16-45-30");
  });
});

describe("resolveReportPath", () => {
  it("builds a path with no tenant or timestamp when neither is given", () => {
    expect(resolveReportPath("./reports", "user-schema", "md")).toBe(
      "reports/user-schema.md"
    );
  });

  it("appends the tenant name when given", () => {
    expect(
      resolveReportPath("./reports", "clients", "md", { tenantName: "my-tenant" })
    ).toBe("reports/clients-my-tenant.md");
  });

  it("appends a formatted timestamp when given", () => {
    const now = new Date(2026, 8, 22, 16, 21, 39);
    expect(
      resolveReportPath("./reports", "clients", "json", {
        tenantName: "my-tenant",
        timestamp: now,
      })
    ).toBe("reports/clients-my-tenant-2026-09-22T16-21-39.json");
  });
});
