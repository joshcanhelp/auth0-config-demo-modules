import { PromptSession } from "auth0-config-demo-modules/packages/core/src/index.js";
import type { Command } from "commander";
import { runValidate, type ValidateOptions } from "../validate/runValidate.js";

// Also runnable as a step inside `pull`/`push`/`watch` rather than only standalone - those
// commands' own options (e.g. `watch --no-validate`) control that.
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
    .action(async (options: ValidateOptions) => {
      const prompts = new PromptSession();
      try {
        await runValidate(options, prompts);
      } finally {
        prompts.close();
      }
    });
}
