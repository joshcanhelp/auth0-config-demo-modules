#!/usr/bin/env -S npx tsx
// The single CLI entry point - see projects/003 Restructure.md for why this exists and what it
// replaces. Today this is run via `npm run cli -- <command> ...` from the repo root; wiring it up
// as a real installable `demo` binary (a package.json "bin" entry, and whether that needs a build
// step or a tsx-shebang launcher) is a deliberately deferred next step, not done here.
import { registerServeCommand } from "auth0-demo-app";
import { registerBulkImportCommand } from "auth0-demo-bulk-import";
import { registerInitCommand } from "auth0-demo-init";
import {
  registerGenerateCommand,
  registerPullCommand,
  registerPushCommand,
  registerValidateCommand,
  registerWatchCommand,
} from "auth0-demo-tenant-config";
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
