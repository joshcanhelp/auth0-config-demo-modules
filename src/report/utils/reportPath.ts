import { join } from "node:path";

// Pads the local timestamp so the filename sorts chronologically and stays
// filesystem-safe (no colons).
export function formatReportTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  );
}

export interface ReportPathOptions {
  // Omit for a report that isn't tied to one tenant.
  tenantName?: string;
  // Pass for a report that should keep a run-by-run history instead of
  // overwriting the previous report.
  timestamp?: Date;
}

// Builds "<reportsDir>/<reportName>[-<tenantName>][-<timestamp>].<format>".
export function resolveReportPath(
  reportsDir: string,
  reportName: string,
  format: string,
  options: ReportPathOptions = {}
): string {
  const { tenantName, timestamp } = options;
  const tenantSuffix = tenantName ? `-${tenantName}` : "";
  const timestampSuffix = timestamp ? `-${formatReportTimestamp(timestamp)}` : "";
  return join(reportsDir, `${reportName}${tenantSuffix}${timestampSuffix}.${format}`);
}
