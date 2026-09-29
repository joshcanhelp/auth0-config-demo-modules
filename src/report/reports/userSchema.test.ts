import { describe, expect, it } from "vitest";

import type { UserSchemaDef } from "../../utils/tenantUserSchema.js";
import { buildUserSchemaReport } from "./userSchema.js";

describe("buildUserSchemaReport", () => {
  it("renders the report title followed by a primitive field section", () => {
    const schema: UserSchemaDef = {
      email: { type: "email", editable: true, required: true },
    };
    const report = buildUserSchemaReport(schema);

    expect(report).toBe(
      [
        "# User Schema Report",
        "",
        "### `email`",
        "",
        "- **Type:** `email`",
        "- **Editable:** Yes",
        "- **Required:** Yes",
        "",
      ].join("\n")
    );
  });

  it("renders a named field with its description", () => {
    const schema: UserSchemaDef = {
      given_name: {
        type: "text",
        name: "First name",
        description: "The user's given name.",
      },
    };
    const report = buildUserSchemaReport(schema);

    expect(report).toContain("### First name (`given_name`)");
    expect(report).toContain("The user's given name.");
  });

  it("renders a group field with its editable sub-fields", () => {
    const schema: UserSchemaDef = {
      app_metadata: {
        type: "group",
        editable: true,
        fields: {
          c360_id: { type: "text", editable: true, required: true },
        },
      },
    };
    const report = buildUserSchemaReport(schema);

    expect(report).toContain("### `app_metadata`");
    expect(report).toContain("- **Editable:** Yes");
    expect(report).toContain("#### `app_metadata.c360_id`");
  });

  it("separates multiple top-level sections with a horizontal rule", () => {
    const schema: UserSchemaDef = {
      email: { type: "email" },
      name: { type: "text" },
    };
    const report = buildUserSchemaReport(schema);

    expect(report).toContain("\n\n---\n\n");
  });
});
