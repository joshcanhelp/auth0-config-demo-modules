import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type FieldUsage = "editable" | "login_response" | "internal";
export type FieldType = "text" | "email" | "boolean" | "password";

export type PrimitiveFieldDef = {
  type: FieldType;
  usage: FieldUsage;
  name?: string;
  required?: boolean;
  description?: string;
};

export type GroupFieldDef = {
  type: "group";
  usage: FieldUsage;
  name?: string;
  description?: string;
  fields: Record<string, PrimitiveFieldDef>;
};

export type FieldDef = PrimitiveFieldDef | GroupFieldDef;
export type UserSchemaDef = Record<string, FieldDef>;

// Types used by the form rendering layer
export type PrimitiveKind = FieldType;

export type PrimitiveField = {
  kind: PrimitiveKind;
  name: string;
  label: string;
  formName: string;
  required: boolean;
  description?: string;
};

export type GroupField = {
  kind: "group";
  name: string;
  label: string;
  formName: string;
  fields: PrimitiveField[];
  description?: string;
};

export type SchemaField = PrimitiveField | GroupField;

export async function loadTenantUserSchema(
  projectDir: string
): Promise<UserSchemaDef | null> {
  const schemaPath = resolve(projectDir, "user-schema.ts");
  if (!existsSync(schemaPath)) return null;
  const module = (await import(schemaPath)) as { userSchema?: UserSchemaDef };
  return module.userSchema ?? null;
}

export function getUserSchemaFields(schema: UserSchemaDef): SchemaField[] {
  return Object.entries(schema).flatMap(([name, def]): SchemaField[] => {
    if (def.type === "group") {
      const editableSubFields: PrimitiveField[] = Object.entries(def.fields)
        .filter(([, subDef]) => subDef.usage === "editable")
        .map(([subName, subDef]) => ({
          kind: subDef.type,
          name: subName,
          label: subDef.name ?? subName.replace(/_/g, " "),
          formName: `${name}[${subName}]`,
          required: subDef.required ?? false,
          description: subDef.description,
        }));
      if (editableSubFields.length === 0) return [];
      return [
        {
          kind: "group" as const,
          name,
          label: def.name ?? name.replace(/_/g, " "),
          formName: name,
          fields: editableSubFields,
          description: def.description,
        },
      ];
    }
    if (def.usage !== "editable") return [];
    return [
      {
        kind: def.type,
        name,
        label: def.name ?? name.replace(/_/g, " "),
        formName: name,
        required: def.required ?? false,
        description: def.description,
      },
    ];
  });
}
