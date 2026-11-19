import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const TENANT_CONFIG_FILENAME = ".auth0vant.json";

type JsonObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Tenant-specific values win per key. Two plain objects at the same key are merged the same way
// one level deeper - so, for example, a tenant can override just validate.skipCodes while still
// inheriting the shared validate.skipInstances. Anything else (an array, a string, ...) is
// replaced wholesale rather than combined, so a tenant's skipCodes array fully replaces the
// shared one instead of appending to it.
export function mergeTenantConfig(shared: JsonObject, tenant: JsonObject): JsonObject {
  const merged: JsonObject = { ...shared };
  for (const [key, tenantValue] of Object.entries(tenant)) {
    const sharedValue = merged[key];
    merged[key] =
      isPlainObject(sharedValue) && isPlainObject(tenantValue)
        ? mergeTenantConfig(sharedValue, tenantValue)
        : tenantValue;
  }
  return merged;
}

// Missing or empty files are "no config here"; malformed JSON or a non-object top level is a
// warning, not a fatal error, matching this app's "warn, don't exit" pattern.
function readConfigFile(filePath: string): JsonObject {
  if (!existsSync(filePath)) return {};

  const raw = readFileSync(filePath, "utf-8").trim();
  if (raw === "") return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`Warning: ${filePath} is not valid JSON. Ignoring it.`);
    return {};
  }

  if (!isPlainObject(parsed)) {
    console.warn(`Warning: ${filePath} must be a JSON object. Ignoring it.`);
    return {};
  }

  return parsed;
}

// Reads both the tenant-specific and shared (one directory up - tenantsRoot, shared by every
// tenant) config files and merges them - see mergeTenantConfig for how keys combine. This is the
// single place every tool reads config from, so any command (not just validate) can land its own
// top-level key in the same file.
export function loadTenantConfigFile(tenantDir: string, tenantsRoot: string): JsonObject {
  const shared = readConfigFile(join(tenantsRoot, TENANT_CONFIG_FILENAME));
  const tenant = readConfigFile(join(tenantDir, TENANT_CONFIG_FILENAME));
  return mergeTenantConfig(shared, tenant);
}
