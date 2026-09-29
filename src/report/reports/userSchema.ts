import type {
  UserSchemaDef,
  PrimitiveFieldDef,
  GroupFieldDef,
} from "../../utils/tenantUserSchema.js";

function formatPrimitiveField(
  key: string,
  def: PrimitiveFieldDef,
  headingLevel: string,
  parentKey?: string
): string {
  const fullKey = parentKey ? `${parentKey}.${key}` : key;
  const displayName = def.name ?? key.replace(/_/g, " ");
  const heading = def.name ? `${displayName} (\`${fullKey}\`)` : `\`${fullKey}\``;

  const props: string[] = [`- **Type:** \`${def.type}\``];
  if (def.editable) props.push(`- **Editable:** Yes`);
  if (def.id_token_claim) props.push(`- **ID token claim:** \`${def.id_token_claim}\``);
  if (def.access_token_claim)
    props.push(`- **Access token claim:** \`${def.access_token_claim}\``);
  if (def.required) props.push(`- **Required:** Yes`);

  const lines = [`${headingLevel} ${heading}`, "", props.join("\n")];
  if (def.description) lines.push("", def.description);

  return lines.join("\n");
}

function formatGroupField(
  key: string,
  def: GroupFieldDef,
  headingLevel: string,
  parentKey?: string
): string {
  const fullKey = parentKey ? `${parentKey}.${key}` : key;
  const displayName = def.name ?? key.replace(/_/g, " ");
  const heading = def.name ? `${displayName} (\`${fullKey}\`)` : `\`${fullKey}\``;

  const lines = [`${headingLevel} ${heading}`];
  if (def.description) lines.push("", def.description);

  const subHeadingLevel = `${headingLevel}#`;
  for (const [subKey, subDef] of Object.entries(def.fields)) {
    lines.push(
      "",
      subDef.type === "group"
        ? formatGroupField(subKey, subDef, subHeadingLevel, fullKey)
        : formatPrimitiveField(subKey, subDef, subHeadingLevel, fullKey)
    );
  }

  return lines.join("\n");
}

export function buildUserSchemaReport(schema: UserSchemaDef): string {
  const sections = Object.entries(schema).map(([key, def]) =>
    def.type === "group"
      ? formatGroupField(key, def as GroupFieldDef, "###")
      : formatPrimitiveField(key, def as PrimitiveFieldDef, "###")
  );
  return ["# User Schema Report", "", sections.join("\n\n---\n\n")].join("\n") + "\n";
}
