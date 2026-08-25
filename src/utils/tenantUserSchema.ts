import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import { writableUserFieldsShape } from "../auth0/userProfile.js";

export type PrimitiveKind = "text" | "email" | "boolean" | "password";

export type PrimitiveField = {
  kind: PrimitiveKind;
  name: string;
  formName: string;
  required: boolean;
};

export type GroupField = {
  kind: "group";
  name: string;
  formName: string;
  fields: PrimitiveField[];
};

export type SchemaField = PrimitiveField | GroupField;

// Zod v4 internal def shape (accessed via _def)
type ZodV4Def = {
  type: string;
  innerType?: z.ZodType;
  format?: string | null;
  shape?: Record<string, z.ZodType>;
  checks?: Array<{ format?: string }>;
};

function getDef(schema: z.ZodType): ZodV4Def {
  return schema._def as ZodV4Def;
}

function unwrapOptional(schema: z.ZodType): z.ZodType {
  const def = getDef(schema);
  if (def.type === "optional" && def.innerType) {
    return unwrapOptional(def.innerType);
  }
  return schema;
}

function isEmailType(schema: z.ZodType): boolean {
  const def = getDef(schema);
  if (def.format === "email") return true;
  if (def.checks?.some((c) => c.format === "email")) return true;
  return false;
}

function getPrimitiveKind(name: string, schema: z.ZodType): PrimitiveKind {
  const def = getDef(schema);
  if (def.type === "boolean") return "boolean";
  if (name === "password") return "password";
  if (isEmailType(schema) || name === "email") return "email";
  return "text";
}

export async function loadTenantUserSchema(tenantDir: string): Promise<z.ZodType | null> {
  const schemaPath = resolve(tenantDir, "user-schema.ts");
  if (!existsSync(schemaPath)) return null;

  const module = (await import(schemaPath)) as { userSchema?: z.ZodType };
  const { userSchema } = module;
  if (!userSchema) return null;

  const def = getDef(userSchema);
  if (def.shape) {
    const unknownFields = Object.keys(def.shape).filter(
      (f) => !(f in writableUserFieldsShape)
    );
    if (unknownFields.length > 0) {
      console.warn(
        `user-schema.ts defines fields not in the writable user profile: ${unknownFields.join(", ")}`
      );
    }
  }

  return userSchema;
}

export function getUserSchemaFields(schema: z.ZodType): SchemaField[] {
  const def = getDef(schema);
  if (!def.shape) return [];

  return Object.entries(def.shape).map(([name, fieldSchema]) => {
    const inner = unwrapOptional(fieldSchema);
    const innerDef = getDef(inner);

    if (innerDef.type === "object" && innerDef.shape) {
      const fields: PrimitiveField[] = Object.entries(innerDef.shape).map(
        ([subName, subSchema]) => {
          const subRequired = getDef(subSchema).type !== "optional";
          const subInner = unwrapOptional(subSchema);
          return {
            kind: getPrimitiveKind(subName, subInner),
            name: subName,
            formName: `${name}[${subName}]`,
            required: subRequired,
          };
        }
      );
      return { kind: "group" as const, name, formName: name, fields };
    }

    const required = getDef(fieldSchema).type !== "optional";
    return {
      kind: getPrimitiveKind(name, inner),
      name,
      formName: name,
      required,
    };
  });
}
