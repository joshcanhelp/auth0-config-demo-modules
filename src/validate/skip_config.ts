import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ALL_DEFINITIONS } from "./definitions.js";
import type { Finding } from "./types.js";

export const SKIP_CONFIG_FILENAME = ".skip-validations.json";

export interface SkipConfig {
  // Codes suppressed everywhere, for every instance, tenant-wide.
  skipCodes: string[];
  // Code -> list of instance identifiers (a Finding's clientName or clientId)
  // for which that code alone should be suppressed.
  skipInstances: Record<string, string[]>;
}

const EMPTY_SKIP_CONFIG: SkipConfig = { skipCodes: [], skipInstances: {} };

const KNOWN_TOP_LEVEL_KEYS = new Set(["skipCodes", "skipInstances"]);

// Reads and validates a tenant's skip config. Missing or empty files are
// treated as "no skips configured"; malformed JSON or unrecognized codes are
// warnings, not fatal errors, matching this app's "warn, don't exit" pattern.
export function loadSkipConfig(tenantDir: string): SkipConfig {
  const filePath = join(tenantDir, SKIP_CONFIG_FILENAME);
  if (!existsSync(filePath)) return EMPTY_SKIP_CONFIG;

  const raw = readFileSync(filePath, "utf-8").trim();
  if (raw === "") return EMPTY_SKIP_CONFIG;

  let parsed: Partial<SkipConfig>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`Warning: ${SKIP_CONFIG_FILENAME} is not valid JSON. Ignoring it.`);
    return EMPTY_SKIP_CONFIG;
  }

  for (const key of Object.keys(parsed)) {
    if (!KNOWN_TOP_LEVEL_KEYS.has(key)) {
      console.warn(
        `Warning: ${SKIP_CONFIG_FILENAME} has an unrecognized top-level key "${key}". Expected "skipCodes" and/or "skipInstances".`
      );
    }
  }

  const skipConfig: SkipConfig = {
    skipCodes: parsed.skipCodes ?? [],
    skipInstances: parsed.skipInstances ?? {},
  };

  const referencedCodes = [
    ...skipConfig.skipCodes,
    ...Object.keys(skipConfig.skipInstances),
  ];
  for (const code of referencedCodes) {
    if (!ALL_DEFINITIONS[code]) {
      console.warn(
        `Warning: ${SKIP_CONFIG_FILENAME} references unknown validation code "${code}".`
      );
    }
  }

  return skipConfig;
}

export function isFindingSkipped(finding: Finding, skipConfig: SkipConfig): boolean {
  if (skipConfig.skipCodes.includes(finding.code)) return true;

  const instances = skipConfig.skipInstances[finding.code];
  if (!instances) return false;

  return instances.some((id) => id === finding.clientName || id === finding.clientId);
}
