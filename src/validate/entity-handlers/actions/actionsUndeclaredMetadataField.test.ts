import { describe, expect, it } from "vitest";

import type { UserSchemaDef } from "../../../utils/tenantUserSchema.js";
import { checkUndeclaredMetadataField } from "./actionsUndeclaredMetadataField.js";

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

describe("checkUndeclaredMetadataField", () => {
  it("returns no findings when there's no schema to check against", () => {
    const action = makeAction("api.user.setAppMetadata('mystery_field', 1);");
    expect(checkUndeclaredMetadataField([action], null)).toHaveLength(0);
  });

  it("flags an app_metadata field read that isn't declared in the schema", () => {
    const action = makeAction("const v = event.user.app_metadata.mystery_field;");
    const findings = checkUndeclaredMetadataField([action], SCHEMA);

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("actions_undeclared_metadata_field");
    expect(findings[0].message).toContain("app_metadata.mystery_field");
  });

  it("does not flag a declared app_metadata field read", () => {
    const action = makeAction("const v = event.user.app_metadata.customer_key;");
    expect(checkUndeclaredMetadataField([action], SCHEMA)).toHaveLength(0);
  });

  it("flags an app_metadata field write that isn't declared in the schema", () => {
    const action = makeAction("api.user.setAppMetadata('mystery_field', 1);");
    const findings = checkUndeclaredMetadataField([action], SCHEMA);

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("actions_undeclared_metadata_field");
    expect(findings[0].message).toContain("app_metadata.mystery_field");
  });

  it("does not flag a declared app_metadata field write, including a nested group's own key", () => {
    const action = makeAction(
      "api.user.setAppMetadata('customer_key', 1); api.user.setAppMetadata('pods_profile', {});"
    );
    expect(checkUndeclaredMetadataField([action], SCHEMA)).toHaveLength(0);
  });

  it("flags a user_metadata field read or write that isn't declared in the schema", () => {
    const action = makeAction(
      "const v = event.user.user_metadata.nickname; api.user.setUserMetadata('nickname', 'x');"
    );
    const findings = checkUndeclaredMetadataField([action], SCHEMA);

    expect(findings).toHaveLength(2);
    expect(findings.every((f) => f.code === "actions_undeclared_metadata_field")).toBe(true);
  });

  it("does not flag a declared user_metadata field read or write", () => {
    const action = makeAction(
      "const v = event.user.user_metadata.given_name; api.user.setUserMetadata('given_name', 'x');"
    );
    expect(checkUndeclaredMetadataField([action], SCHEMA)).toHaveLength(0);
  });

  it("ignores a reference that's commented out", () => {
    const action = makeAction("// api.user.setAppMetadata('mystery_field', 1);");
    expect(checkUndeclaredMetadataField([action], SCHEMA)).toHaveLength(0);
  });
});
