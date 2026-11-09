import { notImplemented } from "auth0-demo-core";
import type { Command } from "commander";

// Planned behavior (see projects/003 Restructure.md): the actual Express demo app (today's root
// src/app + serve.ts) moved into this package. Serves the client list/detail pages, and backs
// their functionality with Authentication API calls, My Account API calls, and user-focused
// Management API calls (via auth0-demo-core) depending on what each client is configured to do.
export function registerServeCommand(program: Command): void {
  program
    .command("serve")
    .description("Run the demo app against a tenant's local config.")
    .option("--tenant <name>", "tenant directory name (skips interactive selection)")
    .option("--port <number>", "port to listen on, overriding the tenant's .env PORT")
    .action(() => notImplemented("serve"));
}
