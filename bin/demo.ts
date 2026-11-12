#!/usr/bin/env -S npx tsx
// The single CLI entry point - see projects/003 Restructure.md for why this exists and what it
// replaces. Today this is run via `npm run cli -- <command> ...` from the repo root; wiring it up
// as a real installable `demo` binary (a package.json "bin" entry, and whether that needs a build
// step or a tsx-shebang launcher) is a deliberately deferred next step, not done here.
//
// Imports below use the "auth0-config-demo-modules/packages/<pkg>/src/..." subpath form, not each
// package's own short workspace name (e.g. "auth0-demo-app") - the short names only resolve via
// npm workspace symlinks, which exist in this repo's own (gitignored) node_modules but never ship
// with an installed copy of this package, so code meant to run from an installed module (this CLI
// included) has to reach every other internal package this same way.
import { registerServeCommand } from "auth0-config-demo-modules/packages/app/src/index.js";
import { registerBulkImportCommand } from "auth0-config-demo-modules/packages/bulk-import/src/index.js";
import { registerInitCommand } from "auth0-config-demo-modules/packages/init/src/index.js";
import {
  registerGenerateCommand,
  registerPullCommand,
  registerPushCommand,
  registerValidateCommand,
  registerWatchCommand,
} from "auth0-config-demo-modules/packages/tenant-config/src/index.js";
import { Command } from "commander";

const program = new Command();

program
  .name("demo")
  .description(
    "Build, configure, and run an Auth0 demo app without publishing anything to npm."
  )
  .version("0.1.0");

registerInitCommand(program);
registerServeCommand(program);
registerValidateCommand(program);
registerPullCommand(program);
registerGenerateCommand(program);
registerPushCommand(program);
registerWatchCommand(program);
registerBulkImportCommand(program);

program.parse();
