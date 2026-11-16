import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type FieldType = "text" | "email" | "boolean" | "password";

export type PrimitiveFieldDef = {
  type: FieldType;
  editable?: boolean;
  id_token_claim?: string;
  access_token_claim?: string;
  name?: string;
  required?: boolean;
  description?: string;
};

export type GroupFieldDef = {
  type: "group";
  fields: Record<string, FieldDef>;
  name?: string;
  description?: string;
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
      // A sub-field can itself be a group (e.g. app_metadata.pods_profile), but the
      // create-user form only renders one level of grouping, so a nested group is never
      // surfaced here - only its own editable primitive sub-fields would be, and none of
      // this tenant's nested groups have any.
      const editableSubFields: PrimitiveField[] = Object.entries(def.fields).flatMap(
        ([subName, subDef]): PrimitiveField[] => {
          if (subDef.type === "group" || !subDef.editable) return [];
          return [
            {
              kind: subDef.type,
              name: subName,
              label: subDef.name ?? subName.replace(/_/g, " "),
              formName: `${name}[${subName}]`,
              required: subDef.required ?? false,
              description: subDef.description,
            },
          ];
        }
      );
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
    if (!def.editable) return [];
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
