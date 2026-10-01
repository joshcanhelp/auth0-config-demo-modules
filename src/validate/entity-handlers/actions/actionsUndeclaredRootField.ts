import type { UserSchemaDef } from "../../../utils/tenantUserSchema.js";
import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { findMatches, type ActionSource } from "./shared.js";

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  actions_undeclared_root_field: {
    level: "important",
    description:
      "A root user profile field is read in code that isn't declared in user-schema.ts.",
    property: "code",
  },
};

// Only `event.user...` is checked, the one access path every Actions trigger guarantees
// refers to the authenticated user's profile. A bare `user.<field>` is deliberately NOT
// checked, since nothing stops an action from naming an unrelated local variable `user` -
// `Pre Registration/code.js` does exactly this for its PODS API lookup result
// (`user.customerKey`, `user.firstName`, etc.) - so scanning those would mistake that
// variable's own fields for user profile fields.
const ROOT_FIELD_READ_PATTERN = /\bevent\.user\.([A-Za-z_][A-Za-z0-9_]*)(?!\s*\()/g;

// event.user.app_metadata/event.user.user_metadata are the group containers, not fields of
// their own - without this, the pattern above would mistake them for a root field literally
// named "app_metadata"/"user_metadata". (See actions_undeclared_metadata_field.ts for the
// check that covers those two groups.)
const METADATA_GROUP_NAMES = new Set(["app_metadata", "user_metadata"]);

function declaredRootFieldNames(schema: UserSchemaDef): Set<string> {
  return new Set(
    Object.entries(schema)
      .filter(([, field]) => field.type !== "group")
      .map(([name]) => name)
  );
}

export function checkUndeclaredRootField(
  actions: unknown[],
  schema: UserSchemaDef | null
): Finding[] {
  const findings: Finding[] = [];

  if (!schema) return findings;

  const declaredRootFields = declaredRootFieldNames(schema);

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
  }

  return findings;
}
