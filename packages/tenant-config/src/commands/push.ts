import { notImplemented } from "auth0-demo-core";
import type { Command } from "commander";

// Planned behavior (see projects/003 Restructure.md): today's src/scripts/import.ts, plus the
// "push only changed files" pain point called out in that doc - `--changed-only` is the stubbed
// option for that, default behavior still to be designed. Entities with no local id are created
// and have their id written back locally, same as today - not a flag, since it's always correct.
export function registerPushCommand(program: Command): void {
  program
    .command("push")
    .description("Push local tenant config to Auth0.")
    .option("--tenant <name>", "tenant directory name (skips interactive selection)")
    .option("--entity <name...>", "limit the push to these entity types")
    .option("--changed-only", "push only files changed since the last pull/push", false)
    .option(
      "--delete",
      "allow deleting records that exist in the tenant but not locally",
      false
    )
    .option("--dry-run", "calculate and print the changes without pushing them", false)
    .action(() => notImplemented("push"));
}
