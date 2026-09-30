import type { UserSchemaDef } from "../../utils/tenantUserSchema.js";
import type { Finding, ValidationDefinition } from "../types.js";
import type { TenantTag } from "./clients.js";

// Checks specific to this project: whether an action's use of user profile fields (root
// fields, user_metadata, app_metadata) matches what's declared in the tenant's
// user-schema.ts - e.g. a claim set in code that isn't declared anywhere in the schema,
// or a write to a field the schema marks non-editable. Schema is optional because not
// every tenant defines one; when absent, checks here should no-op rather than fail.
export const DEFINITIONS: Record<string, ValidationDefinition> = {};

export function validateActionProfileSchemaChecks(
  actions: unknown[],
  schema: UserSchemaDef | null,
  _tenantTag?: TenantTag
): Finding[] {
  const findings: Finding[] = [];

  if (!schema) return findings;

  // TODO: walk `actions`' code for profile-field reads/writes and compare against `schema`.

  return findings;
}
