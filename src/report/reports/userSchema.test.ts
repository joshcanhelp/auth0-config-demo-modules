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

  it("renders id_token_claim and access_token_claim as separate lines", () => {
    const schema: UserSchemaDef = {
      email: {
        type: "email",
        id_token_claim: "email",
        access_token_claim: "petsmart.com/email",
      },
    };
    const report = buildUserSchemaReport(schema);

    expect(report).toContain("- **ID token claim:** `email`");
    expect(report).toContain("- **Access token claim:** `petsmart.com/email`");
  });

  it("renders only the claim that is set", () => {
    const schema: UserSchemaDef = {
      email_verified: { type: "boolean", id_token_claim: "email_verified" },
    };
    const report = buildUserSchemaReport(schema);

    expect(report).toContain("- **ID token claim:** `email_verified`");
    expect(report).not.toContain("Access token claim");
  });

  it("renders a group field's own id_token_claim and access_token_claim", () => {
    const schema: UserSchemaDef = {
      app_metadata: {
        type: "group",
        access_token_claim: "petsmart.com/aos_agent_id",
        fields: {
          agent_id: { type: "text" },
        },
      },
    };
    const report = buildUserSchemaReport(schema);

    expect(report).toContain("- **Access token claim:** `petsmart.com/aos_agent_id`");
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
