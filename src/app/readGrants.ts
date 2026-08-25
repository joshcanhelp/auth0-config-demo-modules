import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface ClientGrant {
  id?: string;
  client_id: string;
  audience: string;
  scope: string[];
}

export function readGrants(tenantDir: string): ClientGrant[] {
  const grantsDir = join(tenantDir, "grants");
  if (!existsSync(grantsDir)) return [];

  const grants: ClientGrant[] = [];
  for (const entry of readdirSync(grantsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    try {
      grants.push(
        JSON.parse(readFileSync(join(grantsDir, entry.name), "utf-8")) as ClientGrant
      );
    } catch {
      // skip unreadable files
    }
  }
  return grants;
}

export function getClientGrants(grants: ClientGrant[], clientId: string): ClientGrant[] {
  return grants.filter((g) => g.client_id === clientId);
}

export function clientHasScope(
  grants: ClientGrant[],
  clientId: string,
  scope: string
): boolean {
  return grants.some((g) => g.client_id === clientId && g.scope.includes(scope));
}
