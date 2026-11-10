// A tenant name becomes a literal folder name (tenants/<name>/), never a path - so it's
// restricted to safe, single-segment characters rather than anything a filesystem would accept.
export function isValidTenantName(name: string): boolean {
  return /^[\w-]+$/.test(name);
}

export const DEFAULT_TENANT_NAME = "demo";

// Avoids suggesting a name that collides with a tenant the project already has - most commonly
// this same default, when adding a second tenant to a project that already has a "demo".
export function pickDefaultTenantName(existingNames: string[]): string {
  if (!existingNames.includes(DEFAULT_TENANT_NAME)) return DEFAULT_TENANT_NAME;
  for (let suffix = 2; ; suffix++) {
    const candidate = `${DEFAULT_TENANT_NAME}-${suffix}`;
    if (!existingNames.includes(candidate)) return candidate;
  }
}
