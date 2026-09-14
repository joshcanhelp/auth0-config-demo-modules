import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  loadTenantUserSchema,
  getUserSchemaFields,
  type UserSchemaDef,
} from "./tenantUserSchema.js";

let dirIndex = 0;
const createdDirs: string[] = [];

function makeTestDir(): string {
  const dir = resolve(`./test-tenant-userschema-${dirIndex++}`);
  mkdirSync(dir, { recursive: true });
  createdDirs.push(dir);
  return dir;
}

function writeSchema(dir: string, content: string) {
  writeFileSync(resolve(dir, "user-schema.ts"), content);
}

afterEach(() => {
  for (const dir of createdDirs) rmSync(dir, { recursive: true, force: true });
  createdDirs.length = 0;
});

describe("loadTenantUserSchema", () => {
  it("returns null when no user-schema.ts exists", async () => {
    const dir = makeTestDir();
    expect(await loadTenantUserSchema(dir)).toBeNull();
  });

  it("returns the exported userSchema object", async () => {
    const dir = makeTestDir();
    writeSchema(
      dir,
      `export const userSchema = { email: { type: "email", usage: "editable", required: true } };`
    );
    const schema = await loadTenantUserSchema(dir);
    expect(schema).toEqual({
      email: { type: "email", usage: "editable", required: true },
    });
  });

  it("returns null when the file has no userSchema export", async () => {
    const dir = makeTestDir();
    writeSchema(dir, `export const something = 42;`);
    expect(await loadTenantUserSchema(dir)).toBeNull();
  });
});

describe("getUserSchemaFields", () => {
  it("returns only editable primitive fields with correct kinds and required flags", () => {
    const schema: UserSchemaDef = {
      email: { type: "email", usage: "editable", required: true },
      name: { type: "text", usage: "editable" },
      email_verified: { type: "boolean", usage: "login_response" },
      sub: { type: "text", usage: "internal" },
    };
    const fields = getUserSchemaFields(schema);
    expect(fields).toEqual([
      {
        kind: "email",
        name: "email",
        label: "email",
        formName: "email",
        required: true,
        description: undefined,
      },
      {
        kind: "text",
        name: "name",
        label: "name",
        formName: "name",
        required: false,
        description: undefined,
      },
    ]);
  });

  it("uses the name property as label when provided", () => {
    const schema: UserSchemaDef = {
      given_name: { type: "text", usage: "editable", name: "First name" },
    };
    const fields = getUserSchemaFields(schema);
    expect(fields[0].kind !== "group" && fields[0].label).toBe("First name");
  });

  it("derives label from field key when name is absent", () => {
    const schema: UserSchemaDef = {
      given_name: { type: "text", usage: "editable" },
    };
    const fields = getUserSchemaFields(schema);
    expect(fields[0].kind !== "group" && fields[0].label).toBe("given name");
  });

  it("returns group fields containing only editable sub-fields", () => {
    const schema: UserSchemaDef = {
      app_metadata: {
        type: "group",
        usage: "editable",
        fields: {
          c360_id: { type: "text", usage: "editable", required: true },
          internal_flag: { type: "boolean", usage: "internal" },
        },
      },
    };
    const fields = getUserSchemaFields(schema);
    expect(fields).toHaveLength(1);
    expect(fields[0].kind).toBe("group");
    if (fields[0].kind === "group") {
      expect(fields[0].name).toBe("app_metadata");
      expect(fields[0].label).toBe("app metadata");
      expect(fields[0].fields).toEqual([
        {
          kind: "text",
          name: "c360_id",
          label: "c360 id",
          formName: "app_metadata[c360_id]",
          required: true,
          description: undefined,
        },
      ]);
    }
  });

  it("omits a group whose sub-fields are all non-editable", () => {
    const schema: UserSchemaDef = {
      app_metadata: {
        type: "group",
        usage: "internal",
        fields: {
          internal_id: { type: "text", usage: "internal" },
        },
      },
    };
    expect(getUserSchemaFields(schema)).toHaveLength(0);
  });

  it("returns required false when required is absent", () => {
    const schema: UserSchemaDef = {
      name: { type: "text", usage: "editable" },
    };
    const fields = getUserSchemaFields(schema);
    expect(fields[0].kind !== "group" && fields[0].required).toBe(false);
  });
});
