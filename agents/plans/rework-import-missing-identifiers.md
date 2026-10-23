# Rework `import.ts`: scan for missing identifiers instead of picking a directory

## Context

Today, `npm run import` asks "which directory/entity type do you want to deploy?" and then does a full `deployCliPush` of that entire type (creates anything new *and* pushes edits to everything that already exists). Five directory types (`flows`, `forms`, `action-modules`, `actions`, `clients`) additionally get special two-phase handling: create → dump → match the newly-created remote object back to its local file by `name` (or `client_id` for clients) → write the real ID into the local file, since those are the types that get hand-authored/generated locally without an ID before they exist in Auth0.

The user wants this flipped: scan the whole tenant config for entries that are missing their identifier (truly new, not-yet-created entities), offer only those as choices (plus "All"), and exit immediately if nothing is pending. Two decisions were confirmed with the user before this plan:

1. **Scope**: the create→backfill mechanics should be generalized into one reusable engine + a declarative per-type config table, not five bespoke copies — "eventually everything with an identifier will need an import path." Confirmed this is abstractable: the *only* things that actually vary per type are the ID field name, how a remote object is matched back to its local file, and small optional pre/post hooks. Along with the original 5, `grants` and `token-exchange-profiles` can also be hand/generator-authored without an ID today and have zero backfill handling — both fit the generic (no-hook) case. `resource-servers` fits too (no generate handler yet, but the mechanism is identical) — including it now costs nothing extra.
2. **Deploy scope**: user chose **"only the missing entities"** — `import.ts` becomes purely "create what's new." It will no longer push edits to already-existing entities (that capability moves entirely to `watch.ts`, which already covers every type including `tenant.json`). This also means singleton config (`tenant`, `branding`, `prompts`, etc.) drops out of `import.ts` entirely — those never have a "missing identifier," and this script no longer does whole-type pushes anyway.

**Key mechanism change this requires**: deploy-cli's `AUTH0_INCLUDED_ONLY` only filters by *type*, not by individual entity. To push only the new entities (not existing ones), we build a scoped temp directory containing *just* the new entry's JSON file(s) (plus, for `actions`/`action-modules`, their referenced `code.js` — confirmed both directory handlers resolve `code` relative to the deploy-cli input root, e.g. `src/context/directory/handlers/actions.ts:27-40` in `auth0-deploy-cli`) and point `deploy()` at that temp dir instead of the real tenant dir. Existing remote entities not included in the scoped push just get `calculateChanges`'s default "would delete, but `AUTH0_ALLOW_DELETE` is false so just warn" treatment (`src/tools/auth0/handlers/default.ts`) — i.e. they're safely left untouched, not deleted.

## New files

### `src/scripts/utils/deployCliScopedPush.ts`
One function: `pushScopedFiles(tenantDir, tenantType, dirName, assetType, fileNames)`.
- `mkdtempSync` a temp tenant-shaped dir, `mkdirSync(join(tmp, dirName))`.
- For each file name: copy the JSON from the real `<tenantDir>/<dirName>/` into the temp copy. If the JSON has a `code` field, also copy the referenced code subdirectory (preserving the same relative path/shape) so `code` resolution still works from the temp root.
- Call `deployCliPush` with the temp dir as the input, but the *real* `tenantDir` still used for the token cache path.
- Clean up the temp dir in a `finally`.

This requires a small, backward-compatible extension to `src/utils/deploy-cli/push-deploy.ts`: add an optional `inputDir` param (defaults to `tenantDir`) that's passed as `deploy()`'s `input_file`, while `tenantDir` continues to be used for `createFileCache` — existing call sites (`watch.ts`, `importClients`-equivalent) are unaffected since the param is optional.

### `src/scripts/utils/identifierBackfill.ts`
- `interface ImportableEntity { dirName: string; assetType: AssetTypes; idField: "id" | "client_id"; matchKey: (obj) => string; mergeStrategy?: "id-only" | "full-replace" /* default "id-only" */; validateBeforeCreate?: (newEntries) => void; afterBackfill?: (ctx) => Promise<void> | void; }`
- `IMPORTABLE_ENTITIES: ImportableEntity[]` — the ordered config table (order preserves the real dependency chain: forms must exist before actions reference their IDs in code; action-modules must be published before actions reference their version; token-exchange-profiles reference actions *by name, resolved against the live tenant* in deploy-cli's own `sanitizeForAPI`, so profiles must come after actions):
  1. `flows` (`id`, match by `name`)
  2. `forms` (`id`, match by `name`, `afterBackfill`: patch `%%FORM:<name>%%` in action code — moved verbatim from today's `importForms`)
  3. `action-modules` → `actionModules` (`id`, match by `name`, `validateBeforeCreate`: throw unless `all_changes_published === true` — moved verbatim; `afterBackfill`: throw if no `latest_version_number`, else patch `module_version_number` in referencing actions — moved verbatim)
  4. `actions` (`id`, match by `name`)
  5. `clients` (`client_id`, match by `name`, `mergeStrategy: "full-replace"` — preserves today's behavior of replacing the local file with the *full* dumped remote object rather than just merging in the id, since Auth0 populates many default fields on client creation; `afterBackfill`: apply `applyUrls`/`buildAppUrls` for localhost + `DEPLOYED_APP_URL`, then a second `pushScopedFiles` call to push just that client's URL update — moved verbatim from today's `importClients`)
  6. `grants` (`id`, match by `(obj) => \`${obj.client_id}::${obj.audience}\`` — grants have no `name` field)
  7. `resource-servers` → `resourceServers` (`id`, match by `name`)
  8. `token-exchange-profiles` → `tokenExchangeProfiles` (`id`, match by `name`)
- `findPendingEntries(tenantDir, entity): Array<{file, data}>` — `existsSync` guard, `readdirSync` the dir, parse each `.json`, filter `!data[entity.idField]`. (Replaces the duplicated "find new X" block at the top of each of today's 5 functions.)
- `importEntityType(entity, tenantDir, tenantType, withToken, tenantDomain): Promise<number>` — the generic engine:
  1. `pending = findPendingEntries(...)`; if empty, return 0.
  2. `entity.validateBeforeCreate?.(pending.map(p => p.data))`.
  3. `pushScopedFiles(tenantDir, tenantType, entity.dirName, entity.assetType, pending.map(p => p.file))` — the create step, now scoped instead of full-type.
  4. `dump()` to a fresh tmp dir scoped to `entity.assetType` (same as today), using `withToken` exactly as today.
  5. For each exported object whose `entity.matchKey` matches a pending entry's `matchKey`: write back to the real local file — either `{ [idField]: realId, ...localData }` (`id-only`) or the full exported object (`full-replace`).
  6. `entity.afterBackfill?.({ tenantDir, tenantType, created: [...] })` with enough info for forms/action-modules/clients hooks to do their thing.
  7. Return count created.

## Rewritten `src/scripts/import.ts`

- Keep the existing header unchanged: `--entity` flag parsing, `selectTenant`, PULL check, env var checks. Drop the `PORT`-required check's placement — still needed (clients hook uses it) but only enforced when clients are actually being imported; simplest to keep it as a hard requirement up front like today, no behavior change there.
- Replace `DIR_TO_ASSET_TYPE`/`dirOptions` construction with: for each `entity` in `IMPORTABLE_ENTITIES` (skipping any in `.deploy-config.json`'s `skipEntities`, same `loadDeployConfig` as today), compute `pending = findPendingEntries(tenantDir, entity)`.
- If every entity has zero pending entries: `console.log("Nothing to import.")` and `process.exit(0)` — no prompt at all.
- `--entity <dirName>` flag: validate it's a known `IMPORTABLE_ENTITIES[].dirName` (error listing valid names if not, same style as today); if valid but has zero pending, print "Nothing to import for \"<dirName>\"." and exit 0; otherwise run just that one.
- Otherwise, interactive: options = `["All", ...entities-with-pending.map(e => ({ label: \`${e.dirName} (${pending.length} new)\`, value: e.dirName }))]`, via the existing `selectPrompt`.
- Run selected entities through `importEntityType` **in `IMPORTABLE_ENTITIES` order** (not selection order) so the dependency chain above is preserved regardless of whether "All" or a single type was picked — e.g. if both `forms` and `actions` are pending and "All" is chosen, forms still runs first.
- Log a final per-type summary line (count created) — same spirit as today's inline `console.log`s inside each function, just surfaced once after the loop too.

## Verification

- `npm run build`, `npm run lint`, `npm run format` in `auth0-config-demo-modules` (matches this repo's established checklist from earlier in this session).
- No existing unit tests cover `import.ts` today (confirmed earlier in this conversation — it's the one script with no `.test.ts`), so this plan doesn't need to update pre-existing tests for it, but I will add focused unit tests for the new shared pieces: `findPendingEntries`, `importEntityType`'s matching/merge-strategy logic, and `pushScopedFiles`'s temp-directory construction (mocking `node:fs` the same way `clients.test.ts`/`tokenExchangeProfiles.test.ts` already do in this project).
- Manual smoke test against the real `apivant-demo-00` tenant: hand-author one new entity missing an id in a cheap-to-verify type (e.g. a `grants/*.json` with no `id`), run `npm run import`, confirm it's the only option offered (plus "All"), confirm it gets created and the local file gets its `id` backfilled, and confirm existing entities in other directories are left untouched (re-run `npm run import` immediately after — should report "Nothing to import").
