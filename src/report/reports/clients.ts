import type { Auth0Client } from "../../types.js";

export type ClientReportFormat = "md" | "json";
export const CLIENT_REPORT_FORMATS: readonly ClientReportFormat[] = ["md", "json"];

export interface ClientReportRow {
  name: string;
  description: string;
  client_id: string;
  app_type: string;
}

function toReportRows(clients: Auth0Client[]): ClientReportRow[] {
  return [...clients]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((client) => ({
      name: client.name,
      description: client.description ?? "",
      client_id: client.client_id,
      app_type: client.app_type,
    }));
}

function toMarkdown(rows: ClientReportRow[], tenantName: string): string {
  const lines = [
    "# Clients Report",
    "",
    `**Tenant:** ${tenantName}`,
    "",
    "| Name | Client ID | Type |",
    "| --- | --- | --- |",
    ...rows.map(
      (row) => `| ${row.name} | ${row.client_id} | ${row.app_type} |`
    ),
  ];
  return lines.join("\n") + "\n";
}

function toJson(rows: ClientReportRow[], tenantName: string): string {
  return JSON.stringify({ tenant: tenantName, clients: rows }, null, 2) + "\n";
}

export function buildClientsReport(
  clients: Auth0Client[],
  tenantName: string,
  format: ClientReportFormat
): string {
  const rows = toReportRows(clients);
  return format === "json" ? toJson(rows, tenantName) : toMarkdown(rows, tenantName);
}
