import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PromptSession } from "auth0-config-demo-modules/packages/core/src/index.js";

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

export async function handleGrant(
  templateDir: string,
  tenantDir: string,
  tenantDomain: string,
  prompts: PromptSession
): Promise<void> {
  const jsonFiles = readdirSync(templateDir).filter((f) => f.endsWith(".json"));
  assert(jsonFiles.length > 0, "No template JSON found in template directory.");

  const templateFileName = jsonFiles[0]!;

  const clientsDir = join(tenantDir, "clients");
  assert(
    existsSync(clientsDir),
    "No clients directory found in tenant. Create a client first."
  );

  const clients = readClients(clientsDir);
  assert(clients.length > 0, "No clients with a client_id found. Import a client first.");

  const options = clients.map((c) => ({
    label: `${c.name} (${c.client_id})`,
    value: c,
  }));

  const selected = await prompts.select("Select a client:", options);

  const outputFileName = templateFileName.replace("Client Name", selected.name);
  const grantsDir = join(tenantDir, "grants");
  const outputPath = join(grantsDir, outputFileName);
  assert(!existsSync(outputPath), `File already exists: ${outputPath}`);

  const canCreateUsers = await prompts.confirm(
    "Should this app be able to create users?"
  );
  const canDeleteUsers = await prompts.confirm(
    "Should this app be able to delete users?"
  );

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
