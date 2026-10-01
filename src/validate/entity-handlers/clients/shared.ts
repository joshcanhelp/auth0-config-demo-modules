// Common types and helpers reused by more than one check in this folder. Logic specific to
// a single validation code belongs in that code's own file, not here.
import { createRequire } from "node:module";

import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";

const _require = createRequire(import.meta.url);

export type CheckmateReportItem = {
  name: string;
  client_id: string;
  field: string;
  status: string;
  value?: string | boolean | number;
  app_type?: string;
};
export type CheckmateClientReport = { name: string; report: CheckmateReportItem[] };
export type CheckmateCheckResult = { details: CheckmateClientReport[] };
export type CheckmateFn = (options: { clients: unknown[] }) => Promise<CheckmateCheckResult>;

export function loadCheck(filename: string): CheckmateFn {
  return _require(`auth0-checkmate/analyzer/lib/clients/${filename}`) as CheckmateFn;
}

// checkmate names a report item "Client Name (client_id)" - this strips the id suffix back
// off for display.
export function clientDisplayName(report: CheckmateReportItem): string {
  return report.client_id
    ? report.name.replace(` (${report.client_id})`, "").trim()
    : report.name;
}

// Walks a checkmate client-check result and builds one Finding per red report matching
// `field`, via `buildMessage`. Shared by every checkmate-wrapped check in this folder that
// doesn't need extra filtering beyond "this field, red status" - see
// clientsClientAuthenticationMethodsPrivateKeyJwt.ts for one that does.
export function findingsForField(
  result: CheckmateCheckResult,
  field: string,
  definitions: Record<string, ValidationDefinition>,
  code: string,
  buildMessage: (report: CheckmateReportItem, value: string | undefined) => string
): Finding[] {
  const findings: Finding[] = [];

  for (const clientReport of result.details) {
    for (const report of clientReport.report) {
      if (report.status !== "red" || report.field !== field) continue;

      const value = report.value !== undefined ? String(report.value) : undefined;
      findings.push(
        buildFinding(definitions, code, clientDisplayName(report), buildMessage(report, value), {
          entityId: report.client_id,
          value,
        })
      );
    }
  }

  return findings;
}
