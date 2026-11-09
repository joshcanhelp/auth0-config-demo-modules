import { notImplemented } from "auth0-demo-core";
import type { Command } from "commander";

// Planned behavior (see projects/003 Restructure.md): today's src/validate/run.ts, moved here
// unchanged in behavior. Also runnable as a step inside `pull`/`push`/`watch` rather than only
// standalone - those commands' own options (e.g. `watch --no-validate`) control that.
export function registerValidateCommand(program: Command): void {
  program
    .command("validate")
    .description("Run validations against a tenant's local config.")
    .option("--tenant <name>", "tenant directory name (skips interactive selection)")
    .option(
      "--tenant-tag <tag>",
      "tag used to scope environment-specific checks, e.g. prod, dev"
    )
    .option("--entity <name...>", "limit validation to one or more entity types")
    .option(
      "--show-passed",
      "also list validation codes that produced no findings",
      false
    )
    .option("--verbose", "print each finding's code and setting below its message", false)
    .option("--csv <dir>", "also write a CSV report into this directory")
    .action(() => notImplemented("validate"));
}
