import { createRequire } from "node:module";

import { buildFinding } from "../finding.js";
import type { Finding, ValidationDefinition } from "../types.js";
import type { TenantTag } from "./clients.js";

const _require = createRequire(import.meta.url);

type FlatItem = {
  name?: string;
  field: string;
  status: string;
  value?: string | number;
};
type NestedItem = {
  scriptName?: string;
  variableName?: string;
  field: string;
  status: string;
  line?: string | number;
};
// checkDASHardCodedValues details may contain nested { name, report[] } items or
// a flat fallback item (e.g. no_database_connections_found) when databases is empty
type NestedReport = { name: string; report: NestedItem[] };
type FallbackItem = { field: string; status: string };
type FlatResult = { details: FlatItem[] };

type FlatFn = (options: { databases: unknown[] }) => Promise<FlatResult>;
type NestedFn = (options: {
  databases: unknown[];
}) => Promise<{ details: (NestedReport | FallbackItem)[] }>;

function loadFlatCheck(filename: string): FlatFn {
  return _require(`auth0-checkmate/analyzer/lib/databases/${filename}`) as FlatFn;
}

function loadNestedCheck(filename: string): NestedFn {
  return _require(`auth0-checkmate/analyzer/lib/databases/${filename}`) as NestedFn;
}

const checkAuthenticationMethods = loadFlatCheck("checkAuthenticationMethods.js");
const checkDASHardCodedValues = loadNestedCheck("checkDASHardCodedValues.js");
const checkEmailAttributeVerification = loadFlatCheck(
  "checkEmailAttributeVerification.js"
);
const checkEnabledDatabaseCustomization = loadFlatCheck(
  "checkEnabledDatabaseCustomization.js"
);
const checkPasswordComplexity = loadFlatCheck("checkPasswordComplexity.js");
const checkPasswordHistory = loadFlatCheck("checkPasswordHistory.js");
const checkPasswordNoPersonalInfo = loadFlatCheck("checkPasswordNoPersonalInfo.js");
const checkPasswordPolicy = loadFlatCheck("checkPasswordPolicy.js");
// checkPromotedDBConnection is skipped - it emits FAIL regardless of configuration

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  databases_only_password_method: {
    level: "recommended",
    description:
      "authentication_methods: Only password authentication is enabled. Consider enabling passkeys.",
  },
  databases_hard_coded_value_detected: {
    level: "important",
    description:
      "customScripts: A hardcoded value was detected in a custom database script.",
  },
  databases_flexible_identifiers_disabled: {
    level: "informational",
    description:
      "attributes: Flexible identifiers are not configured for this connection.",
  },
  databases_verification_by_link_method: {
    level: "recommended",
    description:
      "attributes.email.verification_method: Email verification uses link method. Consider OTP for a better user experience.",
  },
  databases_external_user_store: {
    level: "informational",
    description:
      "options.enabledDatabaseCustomization: Custom database scripts are enabled (external user store).",
  },
  databases_password_min_length: {
    level: "recommended",
    description:
      "options.password_complexity_options.min_length: Minimum password length is below the NIST-recommended 12 characters.",
  },
  databases_password_complexity_not_configured: {
    level: "recommended",
    description:
      "options.password_complexity_options: Password complexity options are not configured.",
  },
  databases_password_history_disabled: {
    level: "recommended",
    description:
      "options.password_history: Password history is disabled. Enable it to prevent password reuse.",
  },
  databases_password_no_personal_info_disabled: {
    level: "recommended",
    description:
      "options.password_no_personal_info: Personal info check for passwords is disabled.",
  },
  databases_password_policy_weak: {
    level: "important",
    description:
      'options.passwordPolicy: Password policy is below "good" or "excellent".',
  },
  databases_password_policy_missing: {
    level: "important",
    description: "options.passwordPolicy: Password policy is not configured.",
  },
};

export async function validateDatabases(
  databases: unknown[],
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const findings: Finding[] = [];

  const [
    authMethodsResult,
    hardcodedResult,
    emailVerResult,
    customizationResult,
    complexityResult,
    historyResult,
    noPersonalInfoResult,
    policyResult,
  ] = await Promise.all([
    checkAuthenticationMethods({ databases }),
    checkDASHardCodedValues({ databases }),
    checkEmailAttributeVerification({ databases }),
    checkEnabledDatabaseCustomization({ databases }),
    checkPasswordComplexity({ databases }),
    checkPasswordHistory({ databases }),
    checkPasswordNoPersonalInfo({ databases }),
    checkPasswordPolicy({ databases }),
  ]);

  for (const item of authMethodsResult.details) {
    if (item.status !== "red") continue;
    const name = item.name ?? "Unknown Connection";
    switch (item.field) {
      case "only_password_method":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "databases_only_password_method",
            name,
            "authentication_methods: Only password authentication is enabled. Consider enabling passkeys."
          )
        );
        break;
      case "no_database_connections_found":
        break;
      default:
        throw new Error(`Unknown database check field: ${item.field}`);
    }
  }

  for (const entry of hardcodedResult.details) {
    if (!("report" in entry)) continue; // Skip flat fallback items (e.g. no_database_connections_found)
    for (const item of entry.report) {
      if (item.status !== "red") continue;
      switch (item.field) {
        case "hard_coded_value_detected":
          findings.push(
            buildFinding(
              DEFINITIONS,
              "databases_hard_coded_value_detected",
              entry.name,
              `customScripts.${item.scriptName}: Hardcoded value in variable "${item.variableName}" at line ${item.line}.`
            )
          );
          break;
        default:
          throw new Error(`Unknown database check field: ${item.field}`);
      }
    }
  }

  for (const item of emailVerResult.details) {
    if (item.status !== "red") continue;
    const name = item.name ?? "Unknown Connection";
    switch (item.field) {
      case "flexible_identifiers_disabled":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "databases_flexible_identifiers_disabled",
            name,
            "attributes: Flexible identifiers are not configured for this connection."
          )
        );
        break;
      case "verification_by_link_method":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "databases_verification_by_link_method",
            name,
            "attributes.email.verification_method: Email verification uses link method. Consider OTP for a better user experience."
          )
        );
        break;
      case "no_database_connections_found":
        break;
      default:
        throw new Error(`Unknown database check field: ${item.field}`);
    }
  }

  for (const item of customizationResult.details) {
    if (item.status !== "red") continue;
    const name = item.name ?? "Unknown Connection";
    switch (item.field) {
      case "external_user_store":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "databases_external_user_store",
            name,
            "options.enabledDatabaseCustomization: Custom database scripts are enabled (external user store)."
          )
        );
        break;
      case "no_database_connections_found":
        break;
      default:
        throw new Error(`Unknown database check field: ${item.field}`);
    }
  }

  for (const item of complexityResult.details) {
    if (item.status !== "red") continue;
    const name = item.name ?? "Unknown Connection";
    switch (item.field) {
      case "password_min_length_fail":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "databases_password_min_length",
            name,
            `options.password_complexity_options.min_length: Minimum password length is ${item.value}. NIST recommends at least 12 characters.`
          )
        );
        break;
      case "password_complexity_not_configured":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "databases_password_complexity_not_configured",
            name,
            "options.password_complexity_options: Password complexity options are not configured."
          )
        );
        break;
      case "no_database_connections_found":
        break;
      default:
        throw new Error(`Unknown database check field: ${item.field}`);
    }
  }

  for (const item of historyResult.details) {
    if (item.status !== "red") continue;
    const name = item.name ?? "Unknown Connection";
    switch (item.field) {
      case "password_history_disabled":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "databases_password_history_disabled",
            name,
            "options.password_history: Password history is disabled. Enable it to prevent password reuse."
          )
        );
        break;
      case "no_database_connections_found":
        break;
      default:
        throw new Error(`Unknown database check field: ${item.field}`);
    }
  }

  for (const item of noPersonalInfoResult.details) {
    if (item.status !== "red") continue;
    const name = item.name ?? "Unknown Connection";
    switch (item.field) {
      case "password_no_personal_info_disabled":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "databases_password_no_personal_info_disabled",
            name,
            "options.password_no_personal_info: Personal info check for passwords is disabled."
          )
        );
        break;
      case "no_database_connections_found":
        break;
      default:
        throw new Error(`Unknown database check field: ${item.field}`);
    }
  }

  for (const item of policyResult.details) {
    if (item.status !== "red") continue;
    const name = item.name ?? "Unknown Connection";
    switch (item.field) {
      case "password_policy":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "databases_password_policy_weak",
            name,
            `options.passwordPolicy: Password policy is "${item.value}". Use "good" or "excellent".`
          )
        );
        break;
      case "missing_password_policy":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "databases_password_policy_missing",
            name,
            "options.passwordPolicy: Password policy is not configured."
          )
        );
        break;
      case "no_database_connections_found":
        break;
      default:
        throw new Error(`Unknown database check field: ${item.field}`);
    }
  }

  return findings;
}
