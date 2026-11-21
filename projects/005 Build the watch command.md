- Watch specific files or entities (choose from list) or all
- Prompt to update local files before watching starts
- Runs export for each local file being watched if yes
- Run validation on the changed file before pushing (turn off with flag)
- Confirm push if validation has warnings (turn off with flag)
- On each watched file change, prompt to deploy
  - Flag to auto-deploy on change
- Only deploy the file(s) changed
- If a new file is found that needs an ID, prompt to import
- Show a menu at rest to quit, deploy (see above), validate, or generate

---

## Decisions (from review before starting)

- **Validate integration is deferred.** `runValidate` (`packages/tenant-config/src/validate/runValidate.ts`)
  isn't callable as a library today - it resolves its own tenant, prints straight to the console,
  and returns nothing; it also validates a whole entity at once (`validateClients(clients,
  tenantTag)`), not a single record. Watch's "validate before push" and "confirm on warnings" steps
  need `Finding[]` back from a call scoped to just the one changed record. That extraction (or a
  scoped-down alternative) is explicitly **not** part of this build - chunk 1 wires watch's call
  sites so validate can be dropped in later, but the real validate call itself is a separate,
  later task.
- **Warning threshold** (for whenever the validate integration lands): "has warnings" means a
  `critical` or `important` finding - `recommended`/`informational` findings are shown but don't
  block the auto-flow.
- **Idle menu model:** the quit/deploy/validate/generate menu uses the same `PromptSession`/
  readline pattern every other command uses (a blocking line prompt), not raw keypress interrupts.
  A file change that arrives while the menu is showing is handled right after the current prompt
  resolves, not mid-keystroke.
- **Chunk 1 scope:** the fs-watcher + idle-menu skeleton, generic against `entityRegistry.ts`'s
  registered entities (clients only today, extends automatically as more are added), with REAL
  single-file push wiring (`pushEntity.ts`'s `pushSingleFile`/`importSingleFile`) - this directly
  fixes the old script's "can't deploy single files" gap. `--auto-deploy` flag vs. prompt-per-change
  is part of this chunk. Validate is an explicit stub; generate/import call sites exist but may or
  may not be wired to real logic yet (see chat for the final call made before coding).

## Deferred (named, not designed)

- Extracting a reusable `Finding[]`-returning function out of `runValidate.ts` (or a scoped-down
  alternative) for watch's validate-before-push step.
- Pull-before-watch prompt ("runs export for each local file being watched if yes").