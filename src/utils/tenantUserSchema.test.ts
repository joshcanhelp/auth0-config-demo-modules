import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import {
  loadTenantUserSchema,
  getUserSchemaFields,
  type PrimitiveField,
} from "./tenantUserSchema.js";

// Each test gets a unique directory so ESM module cache doesn't return
// stale imports when different schema content is written to the same path.
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

  it("returns the exported userSchema", async () => {
    const dir = makeTestDir();
    writeSchema(
      dir,
      `import { z } from "zod";
export const userSchema = z.object({ email: z.string().email(), name: z.string() }).partial();`
    );
    const schema = await loadTenantUserSchema(dir);
    expect(() => schema!.parse({ email: "a@example.com", name: "Alice" })).not.toThrow();
  });

  it("returns null when the file has no userSchema export", async () => {
    const dir = makeTestDir();
    writeSchema(dir, `export const something = 42;`);
    expect(await loadTenantUserSchema(dir)).toBeNull();
  });

  it("schema rejects values that fail field-level validation", async () => {
    const dir = makeTestDir();
    writeSchema(
      dir,
      `import { z } from "zod";
export const userSchema = z.object({ email: z.string().email() }).partial();`
    );
    const schema = await loadTenantUserSchema(dir);
    expect(() => schema!.parse({ email: "not-an-email" })).toThrow();
  });
});

describe("getUserSchemaFields", () => {
  it("returns primitive fields with correct kinds and required flags", () => {
    const schema = z.object({
      email: z.string().email().optional(),
      name: z.string().optional(),
      blocked: z.boolean().optional(),
    });
    const fields = getUserSchemaFields(schema);
    expect(fields).toEqual([
      { kind: "email", name: "email", formName: "email", required: false },
      { kind: "text", name: "name", formName: "name", required: false },
      { kind: "boolean", name: "blocked", formName: "blocked", required: false },
    ]);
  });

  it("marks non-optional fields as required", () => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().optional(),
    });
    const fields = getUserSchemaFields(schema);
    expect((fields[0] as PrimitiveField).required).toBe(true);
    expect((fields[1] as PrimitiveField).required).toBe(false);
  });

  it("returns group fields for nested objects with sub-field form names and required flags", () => {
    const schema = z.object({
      app_metadata: z.object({
        c360_id: z.string().optional(),
        invite_pending: z.boolean().optional(),
      }),
    });
    const fields = getUserSchemaFields(schema);
    expect(fields).toHaveLength(1);
    expect(fields[0].kind).toBe("group");
    if (fields[0].kind === "group") {
      expect(fields[0].name).toBe("app_metadata");
      expect(fields[0].fields).toEqual([
        {
          kind: "text",
          name: "c360_id",
          formName: "app_metadata[c360_id]",
          required: false,
        },
        {
          kind: "boolean",
          name: "invite_pending",
          formName: "app_metadata[invite_pending]",
          required: false,
        },
      ]);
    }
  });

  it("marks sub-fields required based on their own schema, independent of parent optionality", () => {
    const schema = z.object({
      app_metadata: z
        .object({
          required_field: z.string(),
          optional_field: z.string().optional(),
        })
        .optional(),
    });
    const fields = getUserSchemaFields(schema);
    expect(fields[0].kind).toBe("group");
    if (fields[0].kind === "group") {
      expect(fields[0].fields[0].required).toBe(true);
      expect(fields[0].fields[1].required).toBe(false);
    }
  });

  it("returns an empty array for a non-object schema", () => {
    const schema = z.string();
    expect(getUserSchemaFields(schema)).toEqual([]);
  });
});
