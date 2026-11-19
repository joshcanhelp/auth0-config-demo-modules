import { loadTenantConfigFile, TENANT_CONFIG_FILENAME } from "../../tenantConfigFile.js";
import { ALL_DEFINITIONS } from "./definitions.js";
import type { Finding } from "./types.js";

export interface SkipConfig {
  // Codes suppressed everywhere, for every instance, tenant-wide.
  skipCodes: string[];
  // Code -> list of instance identifiers (a Finding's entityName or entityId)
  // for which that code alone should be suppressed.
  skipInstances: Record<string, string[]>;
  // Hardcoded-value-detection findings (actions and databases both use these codes) whose
  // detected value or variable name matches one of these are suppressed tenant-wide, regardless
  // of which action/script they turned up in - for a known value/variable that's expected to
  // recur across many of them.
  skipHardcodedValues: string[];
  skipHardcodedVariable: string[];
}

const EMPTY_SKIP_CONFIG: SkipConfig = {
  skipCodes: [],
  skipInstances: {},
  skipHardcodedValues: [],
  skipHardcodedVariable: [],
};

const KNOWN_VALIDATE_KEYS = new Set([
  "skipCodes",
  "skipInstances",
  "skipHardcodedValues",
  "skipHardcodedVariable",
]);

const HARD_CODED_VALUE_CODES = new Set([
  "actions_hard_coded_value_detected",
  "databases_hard_coded_value_detected",
]);

// Reads a tenant's "validate" config out of TENANT_CONFIG_FILENAME (tenant-specific merged over
// shared - see loadTenantConfigFile). A missing "validate" key is "no skips configured"; a
// malformed value or unrecognized code is a warning, not a fatal error, matching this app's
// "warn, don't exit" pattern.
export function loadSkipConfig(tenantDir: string, tenantsRoot: string): SkipConfig {
  const { validate } = loadTenantConfigFile(tenantDir, tenantsRoot);
  if (validate === undefined) return EMPTY_SKIP_CONFIG;

  if (typeof validate !== "object" || validate === null || Array.isArray(validate)) {
    console.warn(
      `Warning: ${TENANT_CONFIG_FILENAME}'s "validate" key must be an object. Ignoring it.`
    );
    return EMPTY_SKIP_CONFIG;
  }

  const parsed = validate as Partial<SkipConfig>;

  for (const key of Object.keys(parsed)) {
    if (!KNOWN_VALIDATE_KEYS.has(key)) {
      console.warn(
        `Warning: ${TENANT_CONFIG_FILENAME}'s "validate" has an unrecognized key "${key}". ` +
          `Expected "skipCodes", "skipInstances", "skipHardcodedValues", and/or ` +
          `"skipHardcodedVariable".`
      );
    }
  }

  const skipConfig: SkipConfig = {
    skipCodes: parsed.skipCodes ?? [],
    skipInstances: parsed.skipInstances ?? {},
    skipHardcodedValues: parsed.skipHardcodedValues ?? [],
    skipHardcodedVariable: parsed.skipHardcodedVariable ?? [],
  };

  const referencedCodes = [
    ...skipConfig.skipCodes,
    ...Object.keys(skipConfig.skipInstances),
  ];
  for (const code of referencedCodes) {
    if (!ALL_DEFINITIONS[code]) {
      console.warn(
        `Warning: ${TENANT_CONFIG_FILENAME} references unknown validation code "${code}".`
      );
    }
  }

  return skipConfig;
}

export function isFindingSkipped(finding: Finding, skipConfig: SkipConfig): boolean {
  if (skipConfig.skipCodes.includes(finding.code)) return true;

  const instances = skipConfig.skipInstances[finding.code];
  if (instances?.some((id) => id === finding.entityName || id === finding.entityId)) {
    return true;
  }

  if (HARD_CODED_VALUE_CODES.has(finding.code)) {
    if (
      finding.value !== undefined &&
      skipConfig.skipHardcodedValues.includes(finding.value)
    ) {
      return true;
    }
    if (
      finding.field !== undefined &&
      skipConfig.skipHardcodedVariable.includes(finding.field)
    ) {
      return true;
    }
  }

  return false;
}
