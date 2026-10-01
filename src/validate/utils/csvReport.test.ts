import { describe, expect, it } from "vitest";

import type { Finding, ValidationDefinition } from "./types.js";
import { buildCsvReport, formatCsvTimestamp, resolveCsvPath } from "./csvReport.js";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    code: "clients_grants_include_implicit",
    level: "critical",
    entityName: "Acme, Inc.",
    message: "Implicit grant is enabled.",
    ...overrides,
  };
}

const DEFINITIONS: Record<string, ValidationDefinition> = {
  clients_grants_include_implicit: {
    level: "critical",
    description: "Implicit grant is enabled.",
    property: "grant_types",
  },
  clients_ok_check: {
    level: "informational",
    description: "Everything checked out fine.",
    property: "some_field",
  },
};

const CODE_TO_ENTITY: Record<string, string> = {
  clients_grants_include_implicit: "clients",
  clients_ok_check: "clients",
};

describe("formatCsvTimestamp", () => {
  it("pads single-digit month, day, hour, minute, and second", () => {
    const date = new Date(2026, 0, 5, 3, 7, 9);
    expect(formatCsvTimestamp(date)).toBe("2026-01-05T03-07-09");
  });

  it("does not pad double-digit values", () => {
    const date = new Date(2026, 10, 22, 16, 45, 30);
    expect(formatCsvTimestamp(date)).toBe("2026-11-22T16-45-30");
  });
});

describe("resolveCsvPath", () => {
  it("builds a path from the csv directory, tenant directory basename, and timestamp", () => {
    const now = new Date(2026, 8, 22, 16, 21, 39);
    expect(resolveCsvPath("./reports", "./tenants/apivant-demo-00-PUSH", now)).toBe(
      "reports/apivant-demo-00-PUSH-2026-09-22T16-21-39.csv"
    );
  });

  it("uses only the tenant directory's basename, ignoring parent segments", () => {
    const now = new Date(2026, 0, 1, 0, 0, 0);
    expect(resolveCsvPath("/out", "/some/deep/path/my-tenant", now)).toBe(
      "/out/my-tenant-2026-01-01T00-00-00.csv"
    );
  });
});

describe("buildCsvReport", () => {
  it("writes the header row", () => {
    const csv = buildCsvReport({
      findings: [],
      skippedFindings: [],
      passedCodes: [],
      definitions: DEFINITIONS,
      codeToEntity: CODE_TO_ENTITY,
    });
    expect(csv).toBe(
      "status,level,code,entity,description,property,entityName,entityId,field,value,message\n"
    );
  });

  it("writes a fail row for a finding with every field populated", () => {
    const finding = makeFinding({
      entityId: "abc123",
      field: "grant_types",
      value: "implicit",
    });
    const csv = buildCsvReport({
      findings: [finding],
      skippedFindings: [],
      passedCodes: [],
      definitions: DEFINITIONS,
      codeToEntity: CODE_TO_ENTITY,
    });
    const [, row] = csv.trim().split("\n");
    expect(row).toBe(
      'fail,critical,clients_grants_include_implicit,clients,Implicit grant is enabled.,grant_types,"Acme, Inc.",abc123,grant_types,implicit,Implicit grant is enabled.'
    );
  });

  it("leaves optional finding fields blank when absent", () => {
    const csv = buildCsvReport({
      findings: [makeFinding()],
      skippedFindings: [],
      passedCodes: [],
      definitions: DEFINITIONS,
      codeToEntity: CODE_TO_ENTITY,
    });
    const [, row] = csv.trim().split("\n");
    expect(row).toBe(
      'fail,critical,clients_grants_include_implicit,clients,Implicit grant is enabled.,grant_types,"Acme, Inc.",,,,Implicit grant is enabled.'
    );
  });

  it("marks a suppressed finding's status as skipped", () => {
    const csv = buildCsvReport({
      findings: [],
      skippedFindings: [makeFinding()],
      passedCodes: [],
      definitions: DEFINITIONS,
      codeToEntity: CODE_TO_ENTITY,
    });
    const [, row] = csv.trim().split("\n");
    expect(row?.startsWith("skipped,")).toBe(true);
  });

  it("writes a pass row with empty instance columns", () => {
    const csv = buildCsvReport({
      findings: [],
      skippedFindings: [],
      passedCodes: ["clients_ok_check"],
      definitions: DEFINITIONS,
      codeToEntity: CODE_TO_ENTITY,
    });
    const [, row] = csv.trim().split("\n");
    expect(row).toBe(
      "pass,informational,clients_ok_check,clients,Everything checked out fine.,some_field,,,,,"
    );
  });

  it("orders rows as fail, then skipped, then pass", () => {
    const csv = buildCsvReport({
      findings: [makeFinding({ code: "clients_grants_include_implicit" })],
      skippedFindings: [makeFinding({ code: "clients_grants_include_implicit" })],
      passedCodes: ["clients_ok_check"],
      definitions: DEFINITIONS,
      codeToEntity: CODE_TO_ENTITY,
    });
    const statuses = csv
      .trim()
      .split("\n")
      .slice(1)
      .map((row) => row.split(",")[0]);
    expect(statuses).toEqual(["fail", "skipped", "pass"]);
  });

  it("quotes fields containing commas, quotes, or newlines per RFC 4180", () => {
    const finding = makeFinding({
      entityName: 'Client "A", Inc.',
      message: "Line one.\nLine two.",
    });
    const csv = buildCsvReport({
      findings: [finding],
      skippedFindings: [],
      passedCodes: [],
      definitions: DEFINITIONS,
      codeToEntity: CODE_TO_ENTITY,
    });
    expect(csv).toContain('"Client ""A"", Inc."');
    expect(csv).toContain('"Line one.\nLine two."');
  });

  it("leaves entity, description, and property blank for a code with no matching definition", () => {
    const csv = buildCsvReport({
      findings: [makeFinding({ code: "unknown_code" })],
      skippedFindings: [],
      passedCodes: [],
      definitions: DEFINITIONS,
      codeToEntity: CODE_TO_ENTITY,
    });
    const [, row] = csv.trim().split("\n");
    expect(row).toBe(
      'fail,critical,unknown_code,,,,"Acme, Inc.",,,,Implicit grant is enabled.'
    );
  });
});
