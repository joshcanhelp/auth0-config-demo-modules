import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { Connection } from "../types.js";

export function readConnections(tenantDir: string): Connection[] {
  const connections: Connection[] = [];

  const dbDir = join(tenantDir, "database-connections");
  if (existsSync(dbDir)) {
    for (const entry of readdirSync(dbDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dbJsonPath = join(dbDir, entry.name, "database.json");
      if (!existsSync(dbJsonPath)) continue;
      try {
        connections.push(JSON.parse(readFileSync(dbJsonPath, "utf-8")) as Connection);
      } catch {
        // skip unreadable files
      }
    }
  }

  const connDir = join(tenantDir, "connections");
  if (existsSync(connDir)) {
    for (const entry of readdirSync(connDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      try {
        connections.push(
          JSON.parse(readFileSync(join(connDir, entry.name), "utf-8")) as Connection
        );
      } catch {
        // skip unreadable files
      }
    }
  }

  return connections;
}

export function getClientConnections(
  connections: Connection[],
  clientId: string
): Connection[] {
  return connections.filter((c) => c.enabled_clients?.includes(clientId));
}
