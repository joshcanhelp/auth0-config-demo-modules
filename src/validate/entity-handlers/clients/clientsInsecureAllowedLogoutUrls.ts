import type { Management } from "auth0";

import type { Finding, ValidationDefinition } from "../../utils/types.js";
import type { TenantTag } from "../../utils/tenantTag.js";
import { findingsForField, loadCheck } from "./shared.js";

const checkAllowedLogoutUrl = loadCheck("checkAllowedLogoutUrl.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  clients_insecure_allowed_logout_urls: {
    level: "important",
    description: "Insecure pattern in a logout URL.",
    property: "allowed_logout_urls",
  },
};

// Not checked for dev tenants - insecure-looking logout URL patterns are expected there.
export async function checkInsecureAllowedLogoutUrls(
  clients: Management.Client[],
  tenantTag: TenantTag
): Promise<Finding[]> {
  if (tenantTag === "dev") return [];

  const result = await checkAllowedLogoutUrl({ clients });
  return findingsForField(
    result,
    "insecure_allowed_logout_urls",
    DEFINITIONS,
    "clients_insecure_allowed_logout_urls",
    (_report, value) => `allowed_logout_urls: Insecure pattern in logout URL: ${value}`
  );
}
