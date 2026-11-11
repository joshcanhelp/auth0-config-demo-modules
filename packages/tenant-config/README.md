# auth0-demo-tenant-config

The `demo validate`, `demo pull`, `demo generate`, `demo push`, and `demo watch` commands -
everything to do with managing a tenant's config as local files, outside of a push/deploy.

`validate`/`generate`/`push`/`watch` are still stubs - the real logic for those still lives at the
repo root (`src/validate`, `src/generate`, `src/report`, `src/deploy`) and is unaffected by this
package. See `projects/003 Restructure.md` for the full plan this package is part of, including
the two pain points this package is meant to fix (`push --changed-only`, and `generate --import`).

## `pull`

Built against this repo's own Management API client (`auth0-demo-core`), not `auth0-deploy-cli` -
today's `src/scripts/export.ts`/`src/scripts/refresh.ts` use that instead, and are unaffected by
this command.

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
local file for a record that's gone from the tenant.

Each entity module itself (not `pull`) is responsible for keeping live secrets and read-only
fields out of what it returns - see `management-api/clients/exportFields.ts` for the live example
(`client_secret`, `signing_keys`, and the rest, stripped from every `clients.get()`/
`clients.list()` result) - so every consumer of the Management API client gets this for free, not
just `pull`. `created_at`/`updated_at` are the one exception: kept in local config for reference,
and stripped independently on the way back out by `create-client.ts`/`update-client.ts` instead.
