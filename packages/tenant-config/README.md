# auth0-demo-tenant-config

The `demo validate`, `demo pull`, `demo generate`, `demo push`, and `demo watch` commands -
everything to do with managing a tenant's config as local files, outside of a push/deploy.

`validate`/`generate`/`watch` are still stubs - the real logic for those still lives at the repo
root (`src/validate`, `src/generate`, `src/report`, `src/deploy`) and is unaffected by this
package. See `projects/003 Restructure.md` for the full plan this package is part of.

Both `pull` and `push` are built against this repo's own Management API client
(`auth0-demo-core`), not `auth0-deploy-cli` - today's `src/scripts/export.ts`/`import.ts`/
`refresh.ts` use that instead, and are unaffected by either command. `localEntityFiles.ts` (reading
and writing a tenant's local `<entity>/<file>.json` files) is shared by both, so neither depends
on the other - `watch` is expected to build on the same pieces.

Each entity module itself (not `pull`/`push`) is responsible for keeping live secrets and
read-only fields out of what it returns - see `management-api/clients/exportFields.ts` for the
live example (`client_secret`, `signing_keys`, and the rest, stripped from every
`get()`/`list()`/`create()`/`update()` result) - so every consumer of the Management API client
gets this for free. `created_at`/`updated_at` are the one exception: kept in local config for
reference, and stripped independently on the way back out by `create-client.ts`/`update-client.ts`
instead - which also strip whatever else the API itself rejects on write (`client_id`, `encrypted`,
...). A real local record was used to verify this live before trusting either list was complete.

## `pull`

- `--file <path>` - re-fetches just the one record a local file (`tenants/<tenant>/<entity>/<file>.json`)
  already represents, identified by whatever that file has saved under the entity's id field.
- `--entity <name...>` - pulls one or more entity types in full.
- `--local` - pulls every entity type that already has a directory for this tenant.
- `--all` - pulls every entity type `entityRegistry.ts` knows about - every entity module that
  actually exists under `packages/core/src/management-api/` (today: just `clients`). A new entity
  becomes pullable by adding one entry there once its management-api module exists.
- No mode flag - prompts for one, then (for "a specific file"/"a specific entity type") prompts
  again from what's actually local.

Always additive: writes/overwrites a file per record currently in the tenant, never deletes a
local file for a record that's gone from the tenant. The one exception is `--file`/"a specific
file" - a single local record re-fetched by id can 404 if it's since been deleted on the tenant,
in which case it prompts to delete the local file instead of erroring
(`localEntityFiles.ts`'s `confirmAndRemoveMissingRecord`).

## `push`

Requires a `PUSH` tenant (`bootstrapTenant`'s `requireWriteAccess`) - rejects a `PULL` tenant
before building a client at all. A local file with no value under the entity's id field is "new"
and is never touched by a regular push - only `--import` creates new records; everything else
only ever updates a record that already has one (`pushEntity.ts`'s `requireIdentifier`).

- `--file <path>` - updates just the one existing record a local file represents. Same 404
  handling as `pull --file` - prompts to delete the local file instead of erroring if the record
  is gone from the tenant.
- `--entity <name...>` - updates every existing local record for one or more entity types. A new
  (not yet imported) local file is skipped and reported, not an error; a 404'd one is collected
  and prompted for deletion the same way as `--file` (`pushEntity.ts`'s `staleFiles`).
- `--all` - same, for every entity type that has a local directory.
- `--import` - creates local files that don't have an identifier yet, instead of updating ones
  that do. Prompts to pick one new file or import all of them, for a single entity (`--entity`,
  or the only one registered) - not across every entity type at once; see `commands/push.ts`'s own
  comment on `importForEntity` for why. Combine with `--all` to import every new file for that
  entity without the one-or-all prompt.
- No mode flag - prompts for one, offering only files that already have an identifier for "a
  specific file" (a new one belongs to `--import` instead).
- `--delete` and `--changed-only` are declared (matching `003 Restructure.md`'s planned flags) but
  not implemented - `push` throws clearly if either is passed. `--delete` needs a new tenant type
  (a third option alongside `PUSH`/`PULL`) that doesn't exist yet.
