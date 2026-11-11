import { strict as assert } from "node:assert";
import { join } from "node:path";
import {
  createManagementApiClient,
  getClientCredentialsToken,
  listTenantDirectories,
  PromptSession,
  readTenantEnv,
  type ExistingTenant,
} from "auth0-demo-core";
import type { Auth0ManagementApiClient } from "./entityRegistry.js";

export interface TenantContext {
  tenantName: string;
  tenantDir: string;
  api: Auth0ManagementApiClient;
}

// Resolves which tenant to operate on: the given name if one was passed (validated against what
// actually exists), the only tenant directory if there's just one, or null to signal that the
// caller needs to prompt - kept separate from that prompt so the decision itself is testable
// without driving a real one.
export function pickTenantName(
  tenants: ExistingTenant[],
  explicitName?: string
): string | null {
  if (explicitName) {
    assert(
      tenants.some((tenant) => tenant.name === explicitName),
      `No tenant directory found matching "${explicitName}"`
    );
    return explicitName;
  }
  assert(tenants.length > 0, "No tenant directories found.");
  return tenants.length === 1 ? tenants[0].name : null;
}

// Resolves a tenant and builds a Management API client authenticated for it - every
// tenant-config command's starting point.
export async function bootstrapTenant(
  tenantsRoot: string,
  prompts: PromptSession,
  explicitName?: string
): Promise<TenantContext> {
  const tenants = await listTenantDirectories(tenantsRoot);
  const tenantName =
    pickTenantName(tenants, explicitName) ??
    (await prompts.select(
      "Select a tenant:",
      tenants.map((tenant) => ({ label: tenant.name, value: tenant.name }))
    ));

  const tenantDir = join(tenantsRoot, tenantName);
  const env = await readTenantEnv(tenantDir);
  assert(env.TENANT_DOMAIN, `tenants/${tenantName}/.env is missing TENANT_DOMAIN`);
  assert(env.M2M_CLIENT_ID, `tenants/${tenantName}/.env is missing M2M_CLIENT_ID`);
  assert(
    env.M2M_CLIENT_SECRET,
    `tenants/${tenantName}/.env is missing M2M_CLIENT_SECRET`
  );

  const token = await getClientCredentialsToken(
    env.TENANT_DOMAIN,
    env.M2M_CLIENT_ID,
    env.M2M_CLIENT_SECRET
  );
  const api = createManagementApiClient({ domain: env.TENANT_DOMAIN, token });

  return { tenantName, tenantDir, api };
}
