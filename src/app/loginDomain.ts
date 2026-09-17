import type { Auth0Client, TenantConfig } from "../types.js";

export function getLoginDomains(client: Auth0Client, tenantConfig: TenantConfig): string[] {
  const metadataValue = client.client_metadata?.login_domain as string | undefined;
  if (metadataValue) {
    return metadataValue
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
  }
  return tenantConfig.customDomains;
}

export function getDefaultLoginDomain(
  client: Auth0Client,
  tenantConfig: TenantConfig,
  domains: string[]
): string {
  if (client.client_metadata?.login_domain) {
    return domains[0] ?? tenantConfig.tenantDomain;
  }
  return tenantConfig.defaultCustomDomain ?? tenantConfig.tenantDomain;
}
