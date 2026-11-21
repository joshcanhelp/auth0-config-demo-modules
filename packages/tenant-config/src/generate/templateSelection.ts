import type { SelectOption } from "auth0-config-demo-modules/packages/core/src/index.js";

export function getTemplateTypes(templateNames: string[]): string[] {
  const types: string[] = [];

  for (const name of templateNames) {
    const [type] = name.split(" > ");
    if (type && !types.includes(type)) {
      types.push(type);
    }
  }

  return types;
}

export function getTemplatesForType(
  templateNames: string[],
  type: string
): SelectOption<string>[] {
  const prefix = `${type} > `;

  return templateNames
    .filter((name) => name.split(" > ")[0] === type)
    .map((name) => ({
      label: name.startsWith(prefix) ? name.slice(prefix.length) : name,
      value: name,
    }));
}
