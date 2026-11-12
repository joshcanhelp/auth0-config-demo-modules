import { notImplemented } from "auth0-config-demo-modules/packages/core/src/index.js";
import type { Command } from "commander";

// Planned behavior (see projects/003 Restructure.md): today's src/generate/run.ts. `--import`
// chains straight into `push` on success, to close the generate -> import friction called out as
// a pain point in projects/003 Restructure.md.
export function registerGenerateCommand(program: Command): void {
  program
    .command("generate")
    .description("Generate local tenant config files from a source directory.")
    .option("--tenant <name>", "tenant directory name (skips interactive selection)")
    .option("--dir <path>", "directory to read source files from")
    .option(
      "--import",
      "push the generated files immediately after generating them",
      false
    )
    .action(() => notImplemented("generate"));
}
