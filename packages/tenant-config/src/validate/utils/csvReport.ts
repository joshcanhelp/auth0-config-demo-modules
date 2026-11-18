import { basename, join } from "node:path";

import type { Finding, ValidationDefinition } from "./types.js";

export const CSV_HEADER = [
  "status",
  "level",
  "code",
  "entity",
  "description",
  "property",
  "entityName",
  "entityId",
  "field",
  "value",
  "message",
];

// Pads the local timestamp so the filename sorts chronologically and stays
// filesystem-safe (no colons).
export function formatCsvTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  );
}

// Builds "<csvDir>/<tenant-dir-name>-<timestamp>.csv". Does not check whether
// csvDir or the resulting path exist - that's the caller's job.
export function resolveCsvPath(
  csvDir: string,
  tenantDir: string,
  now: Date = new Date()
): string {
  return join(csvDir, `${basename(tenantDir)}-${formatCsvTimestamp(now)}.csv`);
}

// Quotes a field only when it needs it, per RFC 4180.
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function findingCsvRow(
  status: string,
  finding: Finding,
  definitions: Record<string, ValidationDefinition>,
  codeToEntity: Record<string, string>
): string[] {
  return [
    status,
    finding.level,
    finding.code,
    codeToEntity[finding.code] ?? "",
    definitions[finding.code]?.description ?? "",
    definitions[finding.code]?.property ?? "",
    finding.entityName,
    finding.entityId ?? "",
    finding.field ?? "",
    finding.value ?? "",
    finding.message,
  ];
}

function passedCsvRow(
  code: string,
  definitions: Record<string, ValidationDefinition>,
  codeToEntity: Record<string, string>
): string[] {
  const definition = definitions[code];
  return [
    "pass",
    definition.level,
    code,
    codeToEntity[code] ?? "",
    definition.description,
    definition.property,
    "",
    "",
    "",
    "",
    "",
  ];
}

export interface CsvReportInput {
  // Findings that were not suppressed by the tenant's skip config.
  findings: Finding[];
  // Findings that were suppressed by the tenant's skip config.
  skippedFindings: Finding[];
  // Validation codes that produced no findings at all.
  passedCodes: string[];
  definitions: Record<string, ValidationDefinition>;
  codeToEntity: Record<string, string>;
}

// One row per fail/skipped finding and per passed code, in that order.
export function buildCsvReport(input: CsvReportInput): string {
  const { findings, skippedFindings, passedCodes, definitions, codeToEntity } = input;

  const rows = [
    CSV_HEADER,
    ...findings.map((f) => findingCsvRow("fail", f, definitions, codeToEntity)),
    ...skippedFindings.map((f) => findingCsvRow("skipped", f, definitions, codeToEntity)),
    ...passedCodes.map((code) => passedCsvRow(code, definitions, codeToEntity)),
  ];

  return rows.map((row) => row.map(csvField).join(",")).join("\n") + "\n";
}
