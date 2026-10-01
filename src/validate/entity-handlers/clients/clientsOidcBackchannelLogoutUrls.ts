import type { Management } from "auth0";

import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { findingsForField, loadCheck } from "./shared.js";

const checkBackchannelLogout = loadCheck("checkBackchannelLogout.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  "clients_oidc_backchannel_logout.backchannel_logout_urls": {
    level: "recommended",
    description:
      "Back-channel logout is not configured for this server-side web application.",
    property: "oidc_logout.backchannel_logout_urls",
  },
};

export async function checkOidcBackchannelLogoutUrls(
  clients: Management.Client[]
): Promise<Finding[]> {
  const result = await checkBackchannelLogout({ clients });
  return findingsForField(
    result,
    "oidc_backchannel_logout.backchannel_logout_urls",
    DEFINITIONS,
    "clients_oidc_backchannel_logout.backchannel_logout_urls",
    () =>
      "oidc_logout.backchannel_logout_urls: Back-channel logout is not configured for this server-side web application."
  );
}
