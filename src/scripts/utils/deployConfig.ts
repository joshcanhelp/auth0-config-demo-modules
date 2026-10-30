import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface DeployConfig {
  skipEntities: string[];
  keywordReplaceMappings: string[];
}

// Reads <tenantDir>/.deploy-config.json. Entity names match --entity flag values
// (e.g. "clients", "action-modules", "tenant"). Missing file or property yields no skips.
// `keywordReplaceMappings` names env vars (read from process.env at deploy time) to make
// available as "##VAR_NAME##" keyword replacements in that tenant's config files.
export function loadDeployConfig(tenantDir: string): DeployConfig {
  const configPath = join(tenantDir, ".deploy-config.json");

  if (!existsSync(configPath)) {
    return { skipEntities: [], keywordReplaceMappings: [] };
  }

  const parsed = JSON.parse(readFileSync(configPath, "utf-8")) as Partial<DeployConfig>;
  return {
    skipEntities: Array.isArray(parsed.skipEntities) ? parsed.skipEntities : [],
    keywordReplaceMappings: Array.isArray(parsed.keywordReplaceMappings)
      ? parsed.keywordReplaceMappings
      : [],
  };
}
