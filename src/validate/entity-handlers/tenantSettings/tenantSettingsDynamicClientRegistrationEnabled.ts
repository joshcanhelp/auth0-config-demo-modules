import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

const checkEnabledDynamicClientRegistration = loadCheck(
  "checkEnabledDynamicClientRegistration.js"
);

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  tenant_settings_dynamic_client_registration_enabled: {
    level: "important",
    description:
      "Dynamic client registration is enabled. Unauthenticated clients can register themselves.",
    property: "flags.enable_dynamic_client_registration",
  },
};

export async function checkTenantSettingsDynamicClientRegistrationEnabled(
  tenant: unknown
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkEnabledDynamicClientRegistration({ tenant });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "enabled_dynamic_client_registration") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "tenant_settings_dynamic_client_registration_enabled",
        "Tenant Settings",
        "flags.enable_dynamic_client_registration: Dynamic client registration is enabled. Unauthenticated clients can register themselves."
      )
    );
  }

  return findings;
}
