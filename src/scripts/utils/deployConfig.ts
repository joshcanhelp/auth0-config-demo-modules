import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface DeployConfig {
  skipEntities: string[];
}

// Reads <tenantDir>/.deploy-config.json. Entity names match --entity flag values
// (e.g. "clients", "action-modules", "tenant"). Missing file or property yields no skips.
export function loadDeployConfig(tenantDir: string): DeployConfig {
  const configPath = join(tenantDir, ".deploy-config.json");

  if (!existsSync(configPath)) {
    return { skipEntities: [] };
  }

  const parsed = JSON.parse(readFileSync(configPath, "utf-8")) as Partial<DeployConfig>;
  return {
    skipEntities: Array.isArray(parsed.skipEntities) ? parsed.skipEntities : [],
  };
}
