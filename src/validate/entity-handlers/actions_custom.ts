import type { GroupFieldDef, UserSchemaDef } from "../../utils/tenantUserSchema.js";
import { buildFinding } from "../finding.js";
import type { Finding, ValidationDefinition } from "../types.js";
import type { TenantTag } from "./clients.js";

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  actions_undeclared_root_field: {
    level: "important",
    description:
      "A root user profile field is read in code that isn't declared in user-schema.ts.",
    property: "code",
  },
  actions_undeclared_metadata_field: {
    level: "important",
    description:
      "An app_metadata or user_metadata field is read or written in code that isn't declared under that group in user-schema.ts.",
    property: "code",
  },
};

type ActionSource = { name?: string; code?: string };

// Where this check looks for user profile fields in action code:
// - Reads are only checked via `event.user...`, the one access path every Actions trigger
//   guarantees refers to the authenticated user's profile. A bare `user.<field>` is
//   deliberately NOT checked, since nothing stops an action from naming an unrelated local
//   variable `user` - `Pre Registration/code.js` does exactly this for its PODS API lookup
//   result (`user.customerKey`, `user.firstName`, etc.) - so scanning those would mistake
//   that variable's own fields for user profile fields.
// - Writes are only possible through these two Actions API calls, which always refer to the
//   profile regardless of local variable names, so they're unambiguous.
const ROOT_FIELD_READ_PATTERN = /\bevent\.user\.([A-Za-z_][A-Za-z0-9_]*)(?!\s*\()/g;
const APP_METADATA_READ_PATTERN =
  /\bevent\.user\.app_metadata\.([A-Za-z_][A-Za-z0-9_]*)(?!\s*\()/g;
const USER_METADATA_READ_PATTERN =
  /\bevent\.user\.user_metadata\.([A-Za-z_][A-Za-z0-9_]*)(?!\s*\()/g;
const APP_METADATA_WRITE_PATTERN = /\bapi\.user\.setAppMetadata\(\s*['"`]([^'"`]+)['"`]/g;
const USER_METADATA_WRITE_PATTERN =
  /\bapi\.user\.setUserMetadata\(\s*['"`]([^'"`]+)['"`]/g;

// `event.user.app_metadata`/`event.user.user_metadata` are the group containers, not fields
// of their own - without this, ROOT_FIELD_READ_PATTERN would mistake them for a root field
// literally named "app_metadata"/"user_metadata".
const METADATA_GROUP_NAMES = new Set(["app_metadata", "user_metadata"]);

// Strips `//` line comments before scanning, so a commented-out example reference isn't
// mistaken for a real one. Naive - a `//` inside a string literal would be mishandled - but
// good enough for the calls/accesses these checks look for.
function stripLineComments(code: string): string {
  return code.replace(/\/\/.*$/gm, "");
}

function findMatches(code: string, pattern: RegExp): string[] {
  return [...stripLineComments(code).matchAll(pattern)].map((match) => match[1]);
}

function declaredRootFieldNames(schema: UserSchemaDef): Set<string> {
  return new Set(
    Object.entries(schema)
      .filter(([, field]) => field.type !== "group")
      .map(([name]) => name)
  );
}

// The field names a schema group (app_metadata or user_metadata) declares at its top level -
// the names actually passed as setAppMetadata/setUserMetadata's first argument, or read as
// event.user.<group>.<name>. A nested group's own sub-fields (e.g. pods_profile.firstName)
// are read/written as part of the parent object, never on their own, so only the top level
// needs checking here.
function declaredMetadataFieldNames(group: GroupFieldDef | undefined): Set<string> {
  return new Set(group ? Object.keys(group.fields) : []);
}

export function validateActionProfileSchemaChecks(
  actions: unknown[],
  schema: UserSchemaDef | null,
  _tenantTag?: TenantTag
): Finding[] {
  const findings: Finding[] = [];

  if (!schema) return findings;

  const declaredRootFields = declaredRootFieldNames(schema);
  const declaredAppMetadataFields = declaredMetadataFieldNames(
    schema.app_metadata?.type === "group" ? schema.app_metadata : undefined
  );
  const declaredUserMetadataFields = declaredMetadataFieldNames(
    schema.user_metadata?.type === "group" ? schema.user_metadata : undefined
  );

  for (const action of actions as ActionSource[]) {
    const actionName = action.name ?? "Unknown Action";
    const code = action.code ?? "";

    for (const field of findMatches(code, ROOT_FIELD_READ_PATTERN)) {
      if (METADATA_GROUP_NAMES.has(field) || declaredRootFields.has(field)) continue;
      findings.push(
        buildFinding(
          DEFINITIONS,
          "actions_undeclared_root_field",
          actionName,
          `code: event.user.${field} is read here but isn't declared in user-schema.ts.`
        )
      );
    }

    for (const field of findMatches(code, APP_METADATA_READ_PATTERN)) {
      if (declaredAppMetadataFields.has(field)) continue;
      findings.push(
        buildFinding(
          DEFINITIONS,
          "actions_undeclared_metadata_field",
          actionName,
          `code: app_metadata.${field} is read here but isn't declared in user-schema.ts.`
        )
      );
    }

    for (const field of findMatches(code, USER_METADATA_READ_PATTERN)) {
      if (declaredUserMetadataFields.has(field)) continue;
      findings.push(
        buildFinding(
          DEFINITIONS,
          "actions_undeclared_metadata_field",
          actionName,
          `code: user_metadata.${field} is read here but isn't declared in user-schema.ts.`
        )
      );
    }

    for (const field of findMatches(code, APP_METADATA_WRITE_PATTERN)) {
      if (declaredAppMetadataFields.has(field)) continue;
      findings.push(
        buildFinding(
          DEFINITIONS,
          "actions_undeclared_metadata_field",
          actionName,
          `code: app_metadata.${field} is set here but isn't declared in user-schema.ts.`
        )
      );
    }

    for (const field of findMatches(code, USER_METADATA_WRITE_PATTERN)) {
      if (declaredUserMetadataFields.has(field)) continue;
      findings.push(
        buildFinding(
          DEFINITIONS,
          "actions_undeclared_metadata_field",
          actionName,
          `code: user_metadata.${field} is set here but isn't declared in user-schema.ts.`
        )
      );
    }
  }

  return findings;
}
