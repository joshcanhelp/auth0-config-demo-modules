import { notImplemented } from "auth0-config-demo-modules/packages/core/src/index.js";
import type { Command } from "commander";

// Planned behavior (see projects/003 Restructure.md): a net-new user migration flow, not a move
// of existing code. Needs only limited Management API coverage (user-related endpoints), via
// auth0-demo-core.
export function registerBulkImportCommand(program: Command): void {
  const bulkImport = program
    .command("bulk-import")
    .description("Migrate users into a tenant from an external source.");

  bulkImport
    .command("init")
    .description("Check that a tenant and a user source are ready for bulk import.")
    .option("--tenant <name>", "tenant directory name (skips interactive selection)")
    .option("--source <path>", "path to the external user data source")
    .action(() => notImplemented("bulk-import init"));

  bulkImport
    .command("convert")
    .description("Convert a user source into Auth0's bulk import user format.")
    .option("--input <path>", "path to the source file or directory")
    .option("--output <path>", "path to write the converted file(s) to")
    .option("--format <format>", "source format to convert from")
    .action(() => notImplemented("bulk-import convert"));

  bulkImport
    .command("import")
    .description("Run the Auth0 bulk import job against a converted user file.")
    .option("--tenant <name>", "tenant directory name (skips interactive selection)")
    .option("--input <path>", "path to the converted user file")
    .option("--dry-run", "validate the file without running the import job", false)
    .action(() => notImplemented("bulk-import import"));
}
