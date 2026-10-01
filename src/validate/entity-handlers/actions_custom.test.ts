import { describe, expect, it } from "vitest";

import type { UserSchemaDef } from "../../utils/tenantUserSchema.js";
import { validateActionProfileSchemaChecks } from "./actions_custom.js";

const SCHEMA: UserSchemaDef = {
  email: { type: "email", editable: true },
  app_metadata: {
    type: "group",
    fields: {
      customer_key: { type: "text", editable: true },
      pods_profile: {
        type: "group",
        fields: {
          firstName: { type: "text", editable: false },
        },
      },
    },
  },
  user_metadata: {
    type: "group",
    fields: {
      given_name: { type: "text", editable: false },
    },
  },
};

function makeAction(code: string): { name: string; code: string } {
  return { name: "Test Action", code };
}

describe("validateActionProfileSchemaChecks", () => {
  it("returns no findings when there's no schema to check against", () => {
    const action = makeAction("const x = event.user.mystery_field;");
    expect(validateActionProfileSchemaChecks([action], null)).toHaveLength(0);
  });

  it("flags a root field read that isn't declared in the schema", () => {
    const action = makeAction("const phone = event.user.phone_number;");
    const findings = validateActionProfileSchemaChecks([action], SCHEMA);

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("actions_undeclared_root_field");
    expect(findings[0].message).toContain("event.user.phone_number");
  });

  it("does not flag a declared root field read", () => {
    const action = makeAction("const addr = event.user.email;");
    expect(validateActionProfileSchemaChecks([action], SCHEMA)).toHaveLength(0);
  });

  it("does not mistake event.user.app_metadata itself for a root field", () => {
    const action = makeAction("const meta = event.user.app_metadata;");
    expect(validateActionProfileSchemaChecks([action], SCHEMA)).toHaveLength(0);
  });

  it("does not flag a bare `user.<field>` reference to an unrelated shadowed variable", () => {
    // Mirrors Pre Registration/code.js, where `user` is a PODS API lookup result, not the
    // Auth0 profile - none of its fields should be checked against the profile schema.
    const action = makeAction("const key = user.customerKey;");
    expect(validateActionProfileSchemaChecks([action], SCHEMA)).toHaveLength(0);
  });

  it("flags an app_metadata field read that isn't declared in the schema", () => {
    const action = makeAction("const v = event.user.app_metadata.mystery_field;");
    const findings = validateActionProfileSchemaChecks([action], SCHEMA);

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("actions_undeclared_metadata_field");
    expect(findings[0].message).toContain("app_metadata.mystery_field");
  });

  it("does not flag a declared app_metadata field read", () => {
    const action = makeAction("const v = event.user.app_metadata.customer_key;");
    expect(validateActionProfileSchemaChecks([action], SCHEMA)).toHaveLength(0);
  });

  it("flags an app_metadata field write that isn't declared in the schema", () => {
    const action = makeAction("api.user.setAppMetadata('mystery_field', 1);");
    const findings = validateActionProfileSchemaChecks([action], SCHEMA);

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("actions_undeclared_metadata_field");
    expect(findings[0].message).toContain("app_metadata.mystery_field");
  });

  it("does not flag a declared app_metadata field write, including a nested group's own key", () => {
    const action = makeAction(
      "api.user.setAppMetadata('customer_key', 1); api.user.setAppMetadata('pods_profile', {});"
    );
    expect(validateActionProfileSchemaChecks([action], SCHEMA)).toHaveLength(0);
  });

  it("flags a user_metadata field read or write that isn't declared in the schema", () => {
    const action = makeAction(
      "const v = event.user.user_metadata.nickname; api.user.setUserMetadata('nickname', 'x');"
    );
    const findings = validateActionProfileSchemaChecks([action], SCHEMA);

    expect(findings).toHaveLength(2);
    expect(findings.every((f) => f.code === "actions_undeclared_metadata_field")).toBe(true);
  });

  it("does not flag a declared user_metadata field read or write", () => {
    const action = makeAction(
      "const v = event.user.user_metadata.given_name; api.user.setUserMetadata('given_name', 'x');"
    );
    expect(validateActionProfileSchemaChecks([action], SCHEMA)).toHaveLength(0);
  });

  it("ignores a reference that's commented out", () => {
    const action = makeAction("// const v = event.user.phone_number;");
    expect(validateActionProfileSchemaChecks([action], SCHEMA)).toHaveLength(0);
  });
});
