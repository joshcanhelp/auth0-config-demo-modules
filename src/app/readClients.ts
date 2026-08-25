import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { Auth0Client } from "../types.js";

export function readClients(tenantDir: string): Auth0Client[] {
  const clientsDir = join(tenantDir, "clients");
  const files = readdirSync(clientsDir).filter((f) => f.endsWith(".json"));

  return files.map((file) => {
    const content = readFileSync(join(clientsDir, file), "utf-8");
    return JSON.parse(content) as Auth0Client;
  });
}
