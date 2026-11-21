import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { PromptSession } from "auth0-config-demo-modules/packages/core/src/index.js";

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
  tenantDir: string,
  prompts: PromptSession
): Promise<void> {
  const templatePath = join(templateDir, "profile.json");
  assert(existsSync(templatePath), `No profile.json found in template: ${templateDir}`);

  const template = JSON.parse(readFileSync(templatePath, "utf-8")) as Record<
    string,
    unknown
  >;

  const actionsDir = join(tenantDir, "actions");
  assert(
    existsSync(actionsDir),
    "No actions directory found in tenant. Create a custom token exchange action first."
  );

  const actionNames = readCustomTokenExchangeActionNames(actionsDir);
  assert(
    actionNames.length > 0,
    `No actions found supporting the "${CUSTOM_TOKEN_EXCHANGE_TRIGGER}" trigger. Create one first.`
  );

  const defaultName = deriveProfileName(templateDir);
  const nameInput = await prompts.text(`Profile name (default: ${defaultName})`);
  const name = nameInput || defaultName;

  assert(isValidFilename(name), `Invalid name for a filename: "${name}"`);

  const profilesDir = join(tenantDir, "token-exchange-profiles");
  const outputPath = join(profilesDir, `${name}.json`);
  assert(!existsSync(outputPath), `File already exists: ${outputPath}`);

  const action = await prompts.select(
    "Select the custom token exchange action:",
    actionNames.map((n) => ({ label: n, value: n }))
  );

  const defaultSubjectTokenType = template.subject_token_type as string;
  const subjectTokenTypeInput = await prompts.text(
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
