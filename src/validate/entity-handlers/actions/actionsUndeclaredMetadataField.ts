import type { GroupFieldDef, UserSchemaDef } from "../../../utils/tenantUserSchema.js";
import { buildFinding } from "../../finding.js";
import type { Finding, ValidationDefinition } from "../../types.js";
import { findMatches, type ActionSource } from "./shared.js";

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  actions_undeclared_metadata_field: {
    level: "important",
    description:
      "An app_metadata or user_metadata field is read or written in code that isn't declared under that group in user-schema.ts.",
    property: "code",
  },
};

// Reads are only checked via `event.user.app_metadata.<field>` / `event.user.user_metadata.<field>`,
// for the same shadowing reason as the root-field check (see actions_undeclared_root_field.ts).
// Writes are only possible through these two Actions API calls, which always refer to the
// profile regardless of local variable names, so they're unambiguous.
const APP_METADATA_READ_PATTERN =
  /\bevent\.user\.app_metadata\.([A-Za-z_][A-Za-z0-9_]*)(?!\s*\()/g;
const USER_METADATA_READ_PATTERN =
  /\bevent\.user\.user_metadata\.([A-Za-z_][A-Za-z0-9_]*)(?!\s*\()/g;
const APP_METADATA_WRITE_PATTERN = /\bapi\.user\.setAppMetadata\(\s*['"`]([^'"`]+)['"`]/g;
const USER_METADATA_WRITE_PATTERN = /\bapi\.user\.setUserMetadata\(\s*['"`]([^'"`]+)['"`]/g;

// The field names a schema group (app_metadata or user_metadata) declares at its top level -
// the names actually passed as setAppMetadata/setUserMetadata's first argument, or read as
// event.user.<group>.<name>. A nested group's own sub-fields (e.g. pods_profile.firstName)
// are read/written as part of the parent object, never on their own, so only the top level
// needs checking here.
function declaredMetadataFieldNames(group: GroupFieldDef | undefined): Set<string> {
  return new Set(group ? Object.keys(group.fields) : []);
}

export function checkUndeclaredMetadataField(
  actions: unknown[],
  schema: UserSchemaDef | null
): Finding[] {
  const findings: Finding[] = [];

  if (!schema) return findings;

  const declaredAppMetadataFields = declaredMetadataFieldNames(
    schema.app_metadata?.type === "group" ? schema.app_metadata : undefined
  );
  const declaredUserMetadataFields = declaredMetadataFieldNames(
    schema.user_metadata?.type === "group" ? schema.user_metadata : undefined
  );

  function flagIfUndeclared(
    declared: Set<string>,
    group: "app_metadata" | "user_metadata",
    field: string,
    verb: "read" | "set",
    actionName: string
  ): Finding | undefined {
    if (declared.has(field)) return undefined;
    return buildFinding(
      DEFINITIONS,
      "actions_undeclared_metadata_field",
      actionName,
      `code: ${group}.${field} is ${verb} here but isn't declared in user-schema.ts.`
    );
  }

  for (const action of actions as ActionSource[]) {
    const actionName = action.name ?? "Unknown Action";
    const code = action.code ?? "";

    for (const field of findMatches(code, APP_METADATA_READ_PATTERN)) {
      const finding = flagIfUndeclared(
        declaredAppMetadataFields,
        "app_metadata",
        field,
        "read",
        actionName
      );
      if (finding) findings.push(finding);
    }

    for (const field of findMatches(code, USER_METADATA_READ_PATTERN)) {
      const finding = flagIfUndeclared(
        declaredUserMetadataFields,
        "user_metadata",
        field,
        "read",
        actionName
      );
      if (finding) findings.push(finding);
    }

    for (const field of findMatches(code, APP_METADATA_WRITE_PATTERN)) {
      const finding = flagIfUndeclared(
        declaredAppMetadataFields,
        "app_metadata",
        field,
        "set",
        actionName
      );
      if (finding) findings.push(finding);
    }

    for (const field of findMatches(code, USER_METADATA_WRITE_PATTERN)) {
      const finding = flagIfUndeclared(
        declaredUserMetadataFields,
        "user_metadata",
        field,
        "set",
        actionName
      );
      if (finding) findings.push(finding);
    }
  }

  return findings;
}
