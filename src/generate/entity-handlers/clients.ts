import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

import { confirmPrompt } from "../../scripts/utils/selectPrompt.js";
import { textPrompt } from "../../scripts/utils/textPrompt.js";

function applyUrlsForAppType(
  client: Record<string, unknown>,
  appType: string
): Record<string, unknown> {
  if (appType === "non_interactive") {
    const { callbacks, allowed_logout_urls, allowed_origins, ...rest } = client;
    void callbacks;
    void allowed_logout_urls;
    void allowed_origins;
    return rest;
  }

  const localUrl = `http://localhost:${process.env.PORT ?? "3000"}`;
  const deployedUrl = process.env.DEPLOYED_APP_URL?.replace(/\/$/, "");
  const baseUrls = [localUrl, ...(deployedUrl ? [deployedUrl] : [])];

  return {
    ...client,
    callbacks: [],
    allowed_logout_urls: baseUrls,
    ...(appType !== "regular_web" && { allowed_origins: baseUrls }),
  };
}

function isValidFilename(name: string): boolean {
  if (!name) return false;
  return !/[/\\:*?"<>|]/.test(name);
}

export async function handleClient(templateDir: string, tenantDir: string): Promise<void> {
  const jsonFiles = readdirSync(templateDir).filter((f) => f.endsWith(".json"));

  if (jsonFiles.length === 0) {
    console.error("No template JSON found in template directory.");
    process.exit(1);
  }

  const template = JSON.parse(
    readFileSync(join(templateDir, jsonFiles[0]!), "utf-8")
  ) as Record<string, unknown>;

  const defaultName = jsonFiles[0]!.replace(/\.json$/, "");
  const nameInput = await textPrompt(`App name (default: ${defaultName})`);
  const name = nameInput || defaultName;

  if (!isValidFilename(name)) {
    console.error(`Invalid name for a filename: "${name}"`);
    process.exit(1);
  }

  const clientsDir = join(tenantDir, "clients");
  const outputPath = join(clientsDir, `${name}.json`);

  if (existsSync(outputPath)) {
    console.error(`File already exists: ${outputPath}`);
    process.exit(1);
  }

  const description = await textPrompt("Description (press Enter to skip)");
  const hideFromDemo = await confirmPrompt("Hide from demo clients?");
  const promote = await confirmPrompt("Promote to higher environments?");

  if (!existsSync(clientsDir)) {
    mkdirSync(clientsDir, { recursive: true });
  }

  const existingMetadata = (template.client_metadata ?? {}) as Record<string, string>;
  const client_metadata: Record<string, string> = {
    ...existingMetadata,
    ...(hideFromDemo && { hide_from_demo: "true" }),
    promote: promote ? "true" : "false",
  };

  const appType = template.app_type as string | undefined;

  const output = applyUrlsForAppType(
    { ...template, name, ...(description && { description }), client_metadata },
    appType ?? ""
  );

  writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nCreated: ${outputPath}`);
}
