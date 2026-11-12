import { notImplemented } from "auth0-config-demo-modules/packages/core/src/index.js";
import type { Command } from "commander";

// Planned behavior (see projects/003 Restructure.md): today's src/scripts/watch.ts. Prompts to
// pull first (so local files start in sync with the tenant) unless --skip-pull-prompt is set;
// validates each changed file against `validate` before pushing it, unless --no-validate is set;
// and asks for confirmation before pushing a file with validation warnings, unless --no-confirm
// is set.
export function registerWatchCommand(program: Command): void {
  program
    .command("watch")
    .description("Watch local tenant config files and push changes as they're saved.")
    .option("--tenant <name>", "tenant directory name (skips interactive selection)")
    .option("--file <path...>", "watch only these files (prompts to choose if omitted)")
    .option("--entity <name...>", "watch only these entity types")
    .option(
      "--skip-pull-prompt",
      "don't prompt to pull local files before watching starts",
      false
    )
    .option("--no-validate", "push changed files without validating them first")
    .option(
      "--no-confirm",
      "push even when validation produces warnings, without asking first"
    )
    .action(() => notImplemented("watch"));
}
