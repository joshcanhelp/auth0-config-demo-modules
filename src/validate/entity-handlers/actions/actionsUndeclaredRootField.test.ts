import { describe, expect, it } from "vitest";

import type { UserSchemaDef } from "../../../utils/tenantUserSchema.js";
import { checkUndeclaredRootField } from "./actionsUndeclaredRootField.js";

const SCHEMA: UserSchemaDef = {
  email: { type: "email", editable: true },
  app_metadata: {
    type: "group",
    fields: {
      customer_key: { type: "text", editable: true },
    },
  },
};

function makeAction(code: string): { name: string; code: string } {
  return { name: "Test Action", code };
}

describe("checkUndeclaredRootField", () => {
  it("returns no findings when there's no schema to check against", () => {
    const action = makeAction("const x = event.user.mystery_field;");
    expect(checkUndeclaredRootField([action], null)).toHaveLength(0);
  });

  it("flags a root field read that isn't declared in the schema", () => {
    const action = makeAction("const phone = event.user.phone_number;");
    const findings = checkUndeclaredRootField([action], SCHEMA);

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("actions_undeclared_root_field");
    expect(findings[0].message).toContain("event.user.phone_number");
  });

  it("does not flag a declared root field read", () => {
    const action = makeAction("const addr = event.user.email;");
    expect(checkUndeclaredRootField([action], SCHEMA)).toHaveLength(0);
  });

  it("does not mistake event.user.app_metadata itself for a root field", () => {
    const action = makeAction("const meta = event.user.app_metadata;");
    expect(checkUndeclaredRootField([action], SCHEMA)).toHaveLength(0);
  });

  it("does not flag a bare `user.<field>` reference to an unrelated shadowed variable", () => {
    // Mirrors Pre Registration/code.js, where `user` is a PODS API lookup result, not the
    // Auth0 profile - none of its fields should be checked against the profile schema.
    const action = makeAction("const key = user.customerKey;");
    expect(checkUndeclaredRootField([action], SCHEMA)).toHaveLength(0);
  });

  it("ignores a reference that's commented out", () => {
    const action = makeAction("// const v = event.user.phone_number;");
    expect(checkUndeclaredRootField([action], SCHEMA)).toHaveLength(0);
  });
});
