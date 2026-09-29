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

function formatGroupField(key: string, def: GroupFieldDef): string {
  const displayName = def.name ?? key.replace(/_/g, " ");
  const heading = def.name ? `${displayName} (\`${key}\`)` : `\`${key}\``;

  const props: string[] = [];
  if (def.editable) props.push(`- **Editable:** Yes`);
  if (def.id_token_claim) props.push(`- **ID token claim:** \`${def.id_token_claim}\``);
  if (def.access_token_claim)
    props.push(`- **Access token claim:** \`${def.access_token_claim}\``);

  const lines = [`### ${heading}`];
  if (props.length > 0) lines.push("", props.join("\n"));
  if (def.description) lines.push("", def.description);

  for (const [subKey, subDef] of Object.entries(def.fields)) {
    lines.push("", formatPrimitiveField(subKey, subDef, "####", key));
  }

  return lines.join("\n");
}

export function buildUserSchemaReport(schema: UserSchemaDef): string {
  const sections = Object.entries(schema).map(([key, def]) =>
    def.type === "group"
      ? formatGroupField(key, def as GroupFieldDef)
      : formatPrimitiveField(key, def as PrimitiveFieldDef, "###")
  );
  return ["# User Schema Report", "", sections.join("\n\n---\n\n")].join("\n") + "\n";
}
