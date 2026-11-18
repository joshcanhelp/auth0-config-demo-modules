import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

// checkSessionLifetime reports three distinct fields - this one, "session_lifetime" (see
// tenantSettingsSessionLifetime.ts), and "session_cookie_mode" (see
// tenantSettingsSessionCookieMode.ts). Calling it once per field costs a little duplicate
// work, traded for each validation code having its own self-contained file.
const checkSessionLifetime = loadCheck("checkSessionLifetime.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  tenant_settings_idle_session_lifetime: {
    level: "informational",
    description: "Reports the configured idle session lifetime.",
    property: "idle_session_lifetime",
  },
};

// Session lifetime checks surface the current config as informational.
export async function checkTenantSettingsIdleSessionLifetime(
  tenant: unknown
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkSessionLifetime({ tenant });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "idle_session_lifetime") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "tenant_settings_idle_session_lifetime",
        "Tenant Settings",
        `idle_session_lifetime: Idle session lifetime is set to ${item.value}.`
      )
    );
  }

  return findings;
}
