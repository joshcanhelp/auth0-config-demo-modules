#!/usr/bin/env -S npx tsx
// The single CLI entry point - see projects/003 Restructure.md for why this exists and what it
// replaces.
//
// Imports below use the "auth0-config-demo-modules/packages/<pkg>/src/..." subpath form, not each
// package's own short workspace name (e.g. "auth0-demo-app") - the short names only resolve via
// npm workspace symlinks, which exist in this repo's own (gitignored) node_modules but never ship
// with an installed copy of this package, so code meant to run from an installed module (this CLI
// included) has to reach every other internal package this same way.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerBulkImportCommand } from "auth0-config-demo-modules/packages/bulk-import/src/index.js";
import { registerInitCommand } from "auth0-config-demo-modules/packages/init/src/index.js";
import {
  registerGenerateCommand,
  registerPullCommand,
  registerPushCommand,
  registerValidateCommand,
  registerValidateListCommand,
  registerWatchCommand,
} from "auth0-config-demo-modules/packages/tenant-config/src/index.js";
import { Command } from "commander";

// Read rather than hardcoded so `demo --version` always matches the installed package, not
// whatever was typed into this file when the CLI was last touched.
const here = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(
  readFileSync(join(here, "..", "package.json"), "utf-8")
) as {
  version: string;
};

const program = new Command();

program
  .name("demo")
  .description(
    "Build, configure, and run an Auth0 demo app without publishing anything to npm."
  )
  .version(version);

registerInitCommand(program);
registerValidateCommand(program);
registerValidateListCommand(program);
registerPullCommand(program);
registerGenerateCommand(program);
registerPushCommand(program);
registerWatchCommand(program);
registerBulkImportCommand(program);

program.parse();
