import { strict as assert } from "node:assert";
import { join } from "node:path";
import {
  createManagementApiClient,
  getClientCredentialsToken,
  isTenantType,
  listTenantDirectories,
  PromptSession,
  readTenantEnv,
  type ExistingTenant,
  type TenantEnv,
} from "auth0-config-demo-modules/packages/core/src/index.js";
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

export interface BootstrapTenantOptions {
  // Set by a command that writes to the tenant (push, generate --import, watch) - rejects a
  // PULL tenant outright, before a client is even built, rather than letting whatever write call
  // comes first fail however the API happens to fail it. pull leaves this unset: it only ever
  // reads, so it works against either tenant type.
  requireWriteAccess?: boolean;
}

// Separated from bootstrapTenant so the check itself is testable without driving a real token
// fetch - takes just what it needs to decide, not the whole TenantContext.
export function assertWriteAccess(tenantName: string, env: TenantEnv): void {
  assert(
    env.TENANT_TYPE && isTenantType(env.TENANT_TYPE),
    `tenants/${tenantName}/.env has an invalid TENANT_TYPE: "${env.TENANT_TYPE}" (expected PUSH or PULL)`
  );
  assert(
    env.TENANT_TYPE === "PUSH",
    `"${tenantName}" is a PULL (read-only) tenant - this command writes to the tenant, so it ` +
      `needs a PUSH tenant. Change TENANT_TYPE in tenants/${tenantName}/.env if this tenant ` +
      `should allow writes.`
  );
}

// Resolves a tenant and builds a Management API client authenticated for it - every
// tenant-config command's starting point.
export async function bootstrapTenant(
  tenantsRoot: string,
  prompts: PromptSession,
  explicitName?: string,
  options?: BootstrapTenantOptions
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

  if (options?.requireWriteAccess) {
    assertWriteAccess(tenantName, env);
  }

  const token = await getClientCredentialsToken(
    env.TENANT_DOMAIN,
    env.M2M_CLIENT_ID,
    env.M2M_CLIENT_SECRET
  );
  const api = createManagementApiClient({ domain: env.TENANT_DOMAIN, token });

  return { tenantName, tenantDir, api };
}
