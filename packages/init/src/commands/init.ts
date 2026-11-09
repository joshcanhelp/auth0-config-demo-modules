import { notImplemented } from "auth0-demo-core";
import type { Command } from "commander";

// Planned behavior (see projects/003 Restructure.md):
// - Scaffold a new project directory: package.json, serve.ts, a tenants/<name> directory, .env.
// - Prompt for the tenant connection (domain, M2M client id/secret, PUSH/PULL) unless every value
//   is supplied via flags, mirroring the manual steps in the root README's "Getting started".
export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Scaffold a new demo project and connect it to a tenant.")
    .option("--dir <path>", "directory to scaffold into", ".")
    .option("--tenant <name>", "tenant directory name to create")
    .option("--domain <domain>", "Auth0 tenant domain, e.g. my-tenant.us.auth0.com")
    .option("--client-id <id>", "M2M client id used for Management API access")
    .option(
      "--client-secret <secret>",
      "M2M client secret used for Management API access"
    )
    .option("--tenant-type <type>", "PUSH (read/write) or PULL (read-only)", "PUSH")
    .option(
      "--yes",
      "skip interactive prompts, failing if a required value is missing",
      false
    )
    .action(() => notImplemented("init"));
}
