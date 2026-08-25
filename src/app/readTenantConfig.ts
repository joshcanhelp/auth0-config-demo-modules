import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Management } from "auth0";

import type { TenantConfig } from "../types.js";

type CustomDomain = Management.CustomDomain;

export function readTenantConfig(
  tenantDir: string,
  env: NodeJS.ProcessEnv
): TenantConfig {
  const tenantDomain = env.TENANT_DOMAIN;
  if (!tenantDomain) {
    throw new Error("TENANT_DOMAIN environment variable is required");
  }

  const customDomains = readCustomDomains(tenantDir);
  const loginDomain = customDomains.find(Boolean) ?? tenantDomain;
  const friendlyName = readFriendlyName(tenantDir) ?? tenantDomain;

  return { tenantDomain, loginDomain, customDomains, friendlyName };
}

function readFriendlyName(tenantDir: string): string | null {
  try {
    const content = readFileSync(join(tenantDir, "tenant.json"), "utf-8");
    const tenant = JSON.parse(content) as { friendly_name?: string };
    return tenant.friendly_name ?? null;
  } catch {
    return null;
  }
}

function readCustomDomains(tenantDir: string): string[] {
  const customDomainsPath = join(tenantDir, "custom-domains", "custom-domains.json");

  let domains: CustomDomain[];
  try {
    const content = readFileSync(customDomainsPath, "utf-8");
    domains = JSON.parse(content) as CustomDomain[];
  } catch {
    return [];
  }

  const ready = domains.filter((d) => d.status === "ready");
  const defaultDomain = ready.find((d) => d.is_default);
  const others = ready.filter((d) => !d.is_default);
  return [defaultDomain, ...others].filter(Boolean).map((d) => d!.domain!);
}
