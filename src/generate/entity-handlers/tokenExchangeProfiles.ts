import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import process from "node:process";

import { selectPrompt } from "../../scripts/utils/selectPrompt.js";
import { textPrompt } from "../../scripts/utils/textPrompt.js";

const CUSTOM_TOKEN_EXCHANGE_TRIGGER = "custom-token-exchange";

function readCustomTokenExchangeActionNames(actionsDir: string): string[] {
  return readdirSync(actionsDir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      const action = JSON.parse(readFileSync(join(actionsDir, f), "utf-8")) as Record<
        string,
        unknown
      >;
      const triggers = action.supported_triggers as Array<{ id?: string }> | undefined;
      if (
        typeof action.name !== "string" ||
        !triggers?.some((t) => t.id === CUSTOM_TOKEN_EXCHANGE_TRIGGER)
      )
        return [];
      return [action.name];
    });
}

function isValidFilename(name: string): boolean {
  if (!name) return false;
  return !/[/\\:*?"<>|]/.test(name);
}

export function deriveProfileName(templateDir: string): string {
  const parts = basename(templateDir).split(" > ");
  return parts.slice(1).join(" > ");
}

export async function handleTokenExchangeProfile(
  templateDir: string,
  tenantDir: string
): Promise<void> {
  const templatePath = join(templateDir, "profile.json");

  if (!existsSync(templatePath)) {
    console.error(`No profile.json found in template: ${templateDir}`);
    process.exit(1);
  }

  const template = JSON.parse(readFileSync(templatePath, "utf-8")) as Record<
    string,
    unknown
  >;

  const actionsDir = join(tenantDir, "actions");

  if (!existsSync(actionsDir)) {
    console.error(
      "No actions directory found in tenant. Create a custom token exchange action first."
    );
    process.exit(1);
  }

  const actionNames = readCustomTokenExchangeActionNames(actionsDir);

  if (actionNames.length === 0) {
    console.error(
      `No actions found supporting the "${CUSTOM_TOKEN_EXCHANGE_TRIGGER}" trigger. Create one first.`
    );
    process.exit(1);
  }

  const defaultName = deriveProfileName(templateDir);
  const nameInput = await textPrompt(`Profile name (default: ${defaultName})`);
  const name = nameInput || defaultName;

  if (!isValidFilename(name)) {
    console.error(`Invalid name for a filename: "${name}"`);
    process.exit(1);
  }

  const profilesDir = join(tenantDir, "token-exchange-profiles");
  const outputPath = join(profilesDir, `${name}.json`);

  if (existsSync(outputPath)) {
    console.error(`File already exists: ${outputPath}`);
    process.exit(1);
  }

  const action = await selectPrompt(
    "Select the custom token exchange action:",
    actionNames.map((n) => ({ label: n, value: n }))
  );

  const defaultSubjectTokenType = template.subject_token_type as string;
  const subjectTokenTypeInput = await textPrompt(
    `Subject token type (default: ${defaultSubjectTokenType})`
  );
  const subject_token_type = subjectTokenTypeInput || defaultSubjectTokenType;

  const output = {
    ...template,
    name,
    subject_token_type,
    action,
  };

  if (!existsSync(profilesDir)) {
    mkdirSync(profilesDir, { recursive: true });
  }

  writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nCreated: ${outputPath}`);
}
