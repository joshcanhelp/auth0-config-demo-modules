import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

import { confirmPrompt, selectPrompt } from "../../scripts/utils/selectPrompt.js";

interface ClientEntry {
  name: string;
  client_id: string;
}

function readClients(clientsDir: string): ClientEntry[] {
  return readdirSync(clientsDir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      const client = JSON.parse(readFileSync(join(clientsDir, f), "utf-8")) as Record<
        string,
        unknown
      >;
      if (typeof client.name !== "string" || typeof client.client_id !== "string")
        return [];
      return [{ name: client.name, client_id: client.client_id }];
    });
}

export async function handleGrant(templateDir: string, tenantDir: string): Promise<void> {
  const jsonFiles = readdirSync(templateDir).filter((f) => f.endsWith(".json"));

  if (jsonFiles.length === 0) {
    console.error("No template JSON found in template directory.");
    process.exit(1);
  }

  const templateFileName = jsonFiles[0]!;

  const clientsDir = join(tenantDir, "clients");

  if (!existsSync(clientsDir)) {
    console.error("No clients directory found in tenant. Create a client first.");
    process.exit(1);
  }

  const clients = readClients(clientsDir);

  if (clients.length === 0) {
    console.error("No clients with a client_id found. Import a client first.");
    process.exit(1);
  }

  const options = clients.map((c) => ({
    label: `${c.name} (${c.client_id})`,
    value: c,
  }));

  const selected = await selectPrompt("Select a client:", options);

  const outputFileName = templateFileName.replace("Client Name", selected.name);
  const grantsDir = join(tenantDir, "grants");
  const outputPath = join(grantsDir, outputFileName);

  if (existsSync(outputPath)) {
    console.error(`File already exists: ${outputPath}`);
    process.exit(1);
  }

  const canCreateUsers = await confirmPrompt("Should this app be able to create users?");
  const canDeleteUsers = await confirmPrompt("Should this app be able to delete users?");

  const tenantDomain = process.env.TENANT_DOMAIN ?? "";
  const template = JSON.parse(
    readFileSync(join(templateDir, templateFileName), "utf-8")
  ) as Record<string, unknown>;

  const removedScopes = new Set([
    ...(!canCreateUsers ? ["create:users"] : []),
    ...(!canDeleteUsers ? ["delete:users"] : []),
  ]);

  const scope = (template.scope as string[]).filter((s) => !removedScopes.has(s));

  const output = {
    ...template,
    client_id: selected.client_id,
    audience: (template.audience as string).replace("{{TENANT_DOMAIN}}", tenantDomain),
    scope,
  };

  if (!existsSync(grantsDir)) {
    mkdirSync(grantsDir, { recursive: true });
  }

  writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nCreated: ${outputPath}`);
}
