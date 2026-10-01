import type { Management } from "auth0";

import type { Finding, ValidationDefinition } from "../../types.js";
import { findingsForField, loadCheck, type TenantTag } from "./shared.js";

const checkWebOrigins = loadCheck("checkWebOrigins.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  clients_insecure_web_origins_urls: {
    level: "important",
    description: "Insecure pattern in a web origin.",
    property: "web_origins",
  },
};

// Not checked for dev tenants - insecure-looking web origin patterns are expected there.
export async function checkInsecureWebOriginsUrls(
  clients: Management.Client[],
  tenantTag: TenantTag
): Promise<Finding[]> {
  if (tenantTag === "dev") return [];

  const result = await checkWebOrigins({ clients });
  return findingsForField(
    result,
    "insecure_web_origins_urls",
    DEFINITIONS,
    "clients_insecure_web_origins_urls",
    (_report, value) => `web_origins: Insecure pattern in web origin: ${value}`
  );
}
