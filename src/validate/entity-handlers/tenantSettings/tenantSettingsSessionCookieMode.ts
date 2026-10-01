import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

// checkSessionLifetime reports three distinct fields - this one, "idle_session_lifetime" (see
// tenantSettingsIdleSessionLifetime.ts), and "session_lifetime" (see
// tenantSettingsSessionLifetime.ts). Calling it once per field costs a little duplicate work,
// traded for each validation code having its own self-contained file.
const checkSessionLifetime = loadCheck("checkSessionLifetime.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  tenant_settings_session_cookie_mode: {
    level: "informational",
    description: "Reports the configured session cookie mode.",
    property: "session_cookie.mode",
  },
};

// Session lifetime checks surface the current config as informational.
export async function checkTenantSettingsSessionCookieMode(tenant: unknown): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkSessionLifetime({ tenant });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "session_cookie_mode") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "tenant_settings_session_cookie_mode",
        "Tenant Settings",
        `session_cookie.mode: Session cookie mode is "${item.value}".`
      )
    );
  }

  return findings;
}
