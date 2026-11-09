import { notImplemented } from "auth0-demo-core";
import type { Command } from "commander";

// Planned behavior (see projects/003 Restructure.md): read-only Management API calls that write
// local config files - today's src/scripts/export.ts and src/scripts/refresh.ts, unified into one
// command with scoping options instead of two separate scripts.
export function registerPullCommand(program: Command): void {
  program
    .command("pull")
    .description(
      "Pull tenant config from Auth0 into local files (read-only against the API)."
    )
    .option("--tenant <name>", "tenant directory name (skips interactive selection)")
    .option("--file <path>", "pull only the entity whose local file this is")
    .option("--entity <name...>", "pull only these entity types")
    .option("--local", "limit to entity types/files that already exist locally", false)
    .option("--all", "pull every entity type the tenant supports", false)
    .action(() => notImplemented("pull"));
}
