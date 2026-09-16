import type { Management } from "auth0";

import { buildFinding } from "../finding.js";
import type { Finding, ValidationDefinition } from "../types.js";
import type { TenantTag } from "./clients.js";

// Fields that Auth0 exposes on every client but that only make sense for
// browser-redirect flows. Some app types should never have them set.
const EMPTY_ONLY_FIELDS_BY_APP_TYPE: Record<string, (keyof Management.Client)[]> = {
  non_interactive: [
    "callbacks",
    "allowed_logout_urls",
    "allowed_origins",
    "web_origins",
    "initiate_login_uri",
  ],
  regular_web: ["allowed_origins"],
};

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  clients_unexpected_fields_for_app_type: {
    level: "important",
    description:
      "app_type: Fields are set that are not expected for this application type.",
  },
};

function isNotEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function validateCustomClientChecks(
  clients: Management.Client[],
  _tenantTag?: TenantTag
): Finding[] {
  const findings: Finding[] = [];

  for (const client of clients) {
    if (client.global || !client.app_type) continue;

    const emptyOnlyFields = EMPTY_ONLY_FIELDS_BY_APP_TYPE[client.app_type];
    if (!emptyOnlyFields) continue;

    const offendingFields = emptyOnlyFields.filter((field) => isNotEmpty(client[field]));
    if (offendingFields.length === 0) continue;

    findings.push(
      buildFinding(
        DEFINITIONS,
        "clients_unexpected_fields_for_app_type",
        client.name ?? "Unknown Client",
        `${offendingFields.join(", ")}: These fields should be empty for app_type "${client.app_type}".`,
        { clientId: client.client_id, value: offendingFields.join(", ") }
      )
    );
  }

  return findings;
}
