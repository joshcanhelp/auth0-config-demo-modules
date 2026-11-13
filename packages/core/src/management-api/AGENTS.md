# Management API - Agent Instructions

Audience: an agent with no prior context on this codebase, picking up the next entity (e.g.
`connections`, `actions`). This describes how the layer works today and the conventions to follow
writing a new one. For the history of _why_ it's shaped this way - rejected approaches, what was
deliberately deferred - read `projects/001 Replace Deploy CLI.md` first; it's a thread-handoff doc,
not fully current (notably: it says "no tests" - that's stale, tests are expected now, see below),
but the architecture and boundary decisions in it still hold. Re-read the actual code before
trusting anything here; it drifts.

## What this replaces

This whole directory is a from-scratch, entity-by-entity replacement for `auth0-deploy-cli`
(`auth0-deploy-cli: file:../auth0-deploy-cli`, a separate repo). Nothing here imports it or reuses
its code. The `auth0` npm package is used **only for its TypeScript types** (the `Management`
namespace) - nothing instantiates or calls through its `ManagementClient`. When porting a quirk
from `auth0-deploy-cli`, verify it against that repo's actual current source rather than
remembering/guessing it - several ported assumptions this session turned out to be subtly wrong
on first pass (see "Read-path field handling" below for a real example).

## The three layers

```
api-client.ts          the only file that does I/O - knows nothing about any entity
<entity>/*.ts           one pure request builder per endpoint + the entity's own field rules
<entity>/index.ts       rolls the directory up into a namespace
index.ts                composition root - the only file that knows about every entity
```

1. **`api-client.ts`** - `createManagementApiClient({ domain, token })` returns
   `{ request<T>(descriptor) }`. Holds `domain`/`token` so nothing above it passes them per call.
   Deliberately minimal: base URL + auth header + query serialization + JSON parse/error handling.
   No retry, no rate limiting (not started yet - see "Not started" below). Never add
   entity-specific logic here.

2. **An entity directory** (e.g. `clients/`) - one file per Management API endpoint, named after
   the operation: `get-client.ts`, `list-clients.ts`, `create-client.ts`, `update-client.ts`,
   `delete-client.ts`. Each exports a **pure, synchronous request builder**: takes typed
   params/body, returns a `RequestDescriptor` (`{ method, path, query?, body? }`, defined in
   `../api-client.ts`). No I/O, no `domain`/`token`, never calls `fetch` or a client directly.
   Reuse types from the `auth0` package's `Management` namespace for params/bodies/responses
   rather than hand-authoring them, unless the SDK's generated type is demonstrably wrong.

3. **`<entity>/index.ts`** rolls the directory up:
   - Re-exports every builder function and its types.
   - Exports the canonical entity type (e.g. `Client = Management.Client`).
   - Exports `identifierField` (the field that addresses one record, e.g. `"client_id"`) and
     `isSingleton` (`false` for a normal collection resource like clients; `true` for a tenant-wide
     singleton with no id and no list/create/delete, like branding or attackProtection). **This
     meaning was never explicitly confirmed by the user** - it's inferred from "whether the entity
     has an ID or not." Low-risk so far (every entity migrated is unambiguously one or the other);
     confirm before leaning on it structurally for the first genuinely ambiguous case.
   - Exports `create<Entity>Namespace(client: ManagementApiClient)`, wiring each builder to
     `client.request(...)` and returning the entity's callable methods (e.g.
     `{ get, list, create, update, delete }`).
   - `list` always fetches every record across all pages via `paginateAll` (`../pagination.ts`) -
     a generic, entity-agnostic page-walker reused by any entity's `list`. Its exposed params type
     omits `page`/`include_totals`, since pagination is the helper's job, not a meaningful caller
     input for "give me everything." The single-page builder (`list-<entities>.ts`) is untouched
     and still accepts the full param set, for anything that wants one page directly.
   - `get`/`list` run every record through the entity's own export-field handling before
     returning (see "Read-path field handling" below) - every caller gets something safe to write
     to disk without needing to know to do that itself.
   - A `list` may default a filter param that excludes records that don't belong in a demo/local
     config context (e.g. `clients.list()` defaults `is_global: false`, excluding the tenant's own
     implicit client) - overridable by an explicit value in the caller's own params.

4. **`index.ts`** (this directory's top level) is the composition root - the only file that needs
   to know about every entity. `createManagementApiClient(options)` composes the core client
   (`api-client.ts`) with each entity's namespace: `{ ...core, clients: createClientsNamespace(core) }`.
   **Adding a new entity means writing its directory and adding one line here - `api-client.ts`
   never changes.**

## Where entity-specific logic is, and isn't, allowed

Easy to get wrong - re-read this before writing a builder:

- **Allowed in a builder**: refuse to build a request (throw) to block a parameter that should
  never be sent through that path (e.g. `create-client.ts` rejects `client_secret` - rotate
  through the dedicated endpoint instead); strip or restrict fields that are purely mechanical -
  required for the call to succeed regardless of what local config says, and **not fixable by
  editing local config** (a CIMD client's editable-field restriction; `token_vault_privileged_access`,
  whose credentials are tenant-specific ids that can never round-trip).
- **Not allowed in a builder or namespace method**: anything spanning multiple entities or records
  (diffing, exclusion lists, name-to-id resolution via another entity), or coordinating across
  separate handlers. That belongs "one layer up," in code that doesn't exist yet (referred to in
  `001` as "the deploy scripts" - the future `push`/`watch` logic in `packages/tenant-config`).
- **Not allowed here at all**: a problem that's actually _fixable by editing local config_ (a
  deprecated field name a human could rename, a field set outside what's valid for the record's
  shape). That belongs in `src/validate/entity-handlers/<entity>/` instead - one file per check
  (not per field), prefixed with the entity name (`clientsDeprecatedFieldNames.ts`,
  `clientsCimdFieldsNotEditable.ts`), rolled up by an `index.ts`, run against local config _before_
  a push ever reaches this layer. `validate` and `management-api` are meant to stay independent -
  they deliberately don't import each other, so if a rule needs to live in both places (e.g. a
  CIMD-editable-field allowlist also enforced here for real), keep the two copies in sync by hand
  and say so in a comment on both sides.

## Write-path field handling

The generic mechanic is `stripFields` (`../stripFields.ts`) - entity-agnostic, reusable by any
entity's create/update. Takes a body, a flat list of field names, a context label for logging, and
an options bag (`{ reason?, quiet? }`). Logs each field it removes, in gray, **unless**
`quiet: true` - a write-path strip should stay visible ("a push is never silently rewriting a
payload" was an explicit, deliberate request; don't quiet these without being asked). Each entity's
`create-<entity>.ts`/`update-<entity>.ts` has its own `STRIPPED_CREATE_FIELDS`/
`STRIPPED_UPDATE_FIELDS` list of fields the API itself rejects or silently ignores on write
(`created_at`, `updated_at`, `jwks_uri`, read-only ids, immutable-after-creation fields, ...).

A guardrail that isn't a flat field strip (nested-field logic, a conditional restriction) lives in
`<entity>/sanitize.ts`, shared between create and update (e.g. `clients/sanitize.ts`:
`stripSecretEncoded` for `jwt_configuration.secret_encoded`, `stripTokenVaultPrivilegedAccess`).

## Read-path field handling

This is newer than `001` and the thing most likely to bite a careless port: **what belongs in a
local config file is a different list from what the API rejects on write** - don't assume they're
the same list, and don't assume porting `auth0-deploy-cli`'s export-side field handling by name
alone is correct without checking its actual current source.

- `<entity>/exportFields.ts` exports `<ENTITY>_EXPORT_EXCLUDED_FIELDS`: fields a get/list response
  has that should **never** reach a local file - live secrets (`client_secret`, `signing_keys` -
  real certs, not placeholders) and genuinely read-only/deprecated fields the API never accepts
  back on write (`global`, `tenant`, `owners`, ...). Applied via `stripFields(..., { quiet: true })`
  inside the entity's `index.ts` (e.g. `stripExportFields`) - quiet, because logging a secret-strip
  on every single pull is just noise, unlike a write-path strip a human might need to notice.
- **`created_at`/`updated_at` are deliberately _not_ on this list.** They're worth keeping in local
  config for reference even though they're useless to send back - and they already aren't: the
  write-path `STRIPPED_CREATE_FIELDS`/`STRIPPED_UPDATE_FIELDS` lists strip them independently, so
  nothing else needs to change to keep them out of what gets sent. A field belongs on the
  write-path list, the read-path list, or both, for different reasons - reason about each
  direction separately rather than assuming one shared "read-only fields" list covers both.
- **A deprecated field that's still the only place a setting lives for some records needs to be
  _promoted_, not just dropped.** Auth0 sometimes still returns a deprecated field for backward
  compatibility (e.g. `cross_origin_auth`, superseded by `cross_origin_authentication`) - a record
  old enough to only have the deprecated field would silently lose the setting if a read-path strip
  just deleted it. The fix: a small `promote<Thing>` function (e.g.
  `promoteDeprecatedCrossOriginAuth`) that carries the deprecated field's value onto the current
  field name first, _if that field isn't already present_, then the exclusion list drops the
  deprecated name as normal. This was an actual bug caught after it shipped, not a hypothetical -
  check whether an entity's deprecated fields need this before assuming a flat exclusion list is
  enough.
- **Never let a get/list return a live secret un-stripped into something that could get written to
  disk.** This happened for real this session (a `client_secret` briefly landed in a tracked file
  during testing, caught and reverted before being committed) - when writing a new entity's
  `exportFields.ts`, actually check what the raw API response contains (a live call against a real
  tenant, not just reading docs) before trusting your own field list is complete.

## Pagination

`../pagination.ts`'s `paginateAll(fetchPage, options?)` is generic and entity-agnostic - a new
entity's `list` should use it the same way `clients/index.ts` does, not reimplement paging. It
loops until a page comes back shorter than the requested size (including empty), deliberately
avoiding `include_totals`/`total`-based termination since the items-array field name differs per
entity's paginated envelope (`clients`, `users`, ...). Default page size 100, overridable via
`options.perPage`.

## Scope checks

Every builder calls `requireScopes` (`../requireScopes.ts`) with the scope(s) its own operation
needs, before building the request - see that file, `clients/get-client.ts`, and `clients/index.ts`
(the `async` wrapping on `create`/`update`/`delete` matters, not just stylistic - read the comment
there) for the mechanism and reasoning.

## Testing

Tests are expected now - `001`'s "no tests right now" note is stale (left from an earlier,
unstable iteration of this shape; the user never re-raised holding off once the shape settled, and
plenty of tests were added this session without objection). Co-locate `<file>.test.ts` next to
what it tests. For a namespace's `get`/`list` (field-stripping behavior, filter defaults), build a
fake `ManagementApiClient` with a mocked `request` (`vi.fn().mockResolvedValue(...)`) - no real
`fetch`, no real network. Pure request builders need no mocking at all - they return a plain
object. See `clients/index.test.ts`, `exportFields.test.ts`, `stripFields.test.ts` for the current
pattern.

## Making a new entity pullable

Writing the `management-api/<entity>/` module is necessary but not sufficient for
`demo pull`/`--entity`/`--local`/`--all` to know about it - that's a separate, small registration
step in a different package: `packages/tenant-config/src/entityRegistry.ts`. Add one entry mapping
the entity's name to its `list`/`get` functions, `identifierField`, and a `fileName(record)`
function (what a pulled record's local filename is based on, e.g. a client's `.name`). `pull --all`
is exactly "every entry in this registry" - nothing else to wire up for a new entity to become
pullable once its `management-api` module exists.

## Not started yet (named, not designed - don't assume any of this exists)

- **Rate limit handling** - `auth0-deploy-cli`'s reference implementation (exponential backoff on
  429, `Retry-After` support, a concurrency pool capped at 80% of Auth0's documented limit) was
  flagged as the one part of that repo worth porting. Not done. Whether it lives inside
  `api-client.ts`'s `request()` or as a separate composable wrapper (mirroring how `paginateAll`
  ended up separate) hasn't been decided - the pagination precedent suggests separate, but confirm
  rather than assume.
- **Token caching** - this repo has a working reference elsewhere (`clientCredentials.ts`'s
  `getClientCredentialsToken` takes an optional `cache`; `src/scripts/utils/fileCache.ts` is the
  existing file-backed cache used by the old `export.ts`). Whether a new entity's call sites should
  wire this in, and how, hasn't been decided.
- **Wiring `src/validate` into push** - validation still only runs standalone (`npm run validate`
  equivalent); nothing in a push/deploy path calls it yet. Don't assume "run before push" means
  "block on any finding" vs. "warn and continue" vs. "block only on critical" - confirm before
  wiring it in, if that's ever the task.
- `packages/core/src/management-api/actions-modules/README.md` has a standalone, unacted-on note:
  action module version numbers need to be pulled down after deployment and reconciled with the
  local module file - parked, not designed.
