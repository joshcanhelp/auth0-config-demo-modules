# Replace Deploy CLI - context for picking up this thread

Audience: an agent resuming this work with no prior conversation history. This is not
documentation of what exists (read the code for that) - it's the decisions, rejected approaches,
and open questions that produced the current code, which aren't recoverable from the code or repo
structure alone. Re-read the actual files before acting on anything below; the user edits this
code directly between sessions and this doc will drift.

## The goal

`auth0-deploy-cli` (a separate repo, local checkout at `/Users/joshcanhelp/Code/auth0-deploy-cli`,
custom branch `josh-main`, pulled into this repo as `"auth0-deploy-cli": "file:../auth0-deploy-cli"`
in `package.json`) is being replaced with custom push/pull logic, **entity by entity**, not a
big-bang rewrite. `clients` was picked as the first entity to migrate - partly to validate the
architecture, even though a prior survey (see below) flagged `clients` as one of the *riskiest*
entities to migrate, not the easiest. Expect the shape built for `clients` to become the template
every other entity follows.

The new code lives at `src/auth0/management-api/` in this repo
(`auth0-config-demo-modules`). Nothing wires it into the actual deploy flow yet -
`src/utils/deploy-cli/push-deploy.ts` still calls `deploy()` from `auth0-deploy-cli` wholesale.
That integration point does not exist yet and hasn't been discussed.

## Why this approach (compressed findings from a prior deep-survey)

An earlier research pass evaluated `auth0-deploy-cli` to decide whether to keep it as a backbone
or replace it. Key findings that shaped everything below:

- **There is no separate "API layer" to import.** Every `this.client.X.Y()` call in every
  deploy-cli handler is just the official `auth0` npm SDK's `ManagementClient`. Use the SDK
  directly (or reuse its TypeScript types, which is what's happening here) - don't depend on
  deploy-cli for raw API access.
- **The one piece of real infrastructure worth porting** is deploy-cli's `client.ts`: an
  auto-pagination wrapper (handles both offset/page-based and checkpoint-based pagination styles)
  plus a rate-limit-aware concurrency pool with exponential backoff on 429s, tuned to 80% of
  Auth0's documented limit. Not ported yet - see "Not started" below.
- **The actual hard-won asset in deploy-cli is ~22 entity-specific quirks** - Auth0 API behaviors
  discovered the hard way (400s, silent data loss, ordering bugs). For `clients` specifically
  (`auth0-deploy-cli/src/tools/auth0/handlers/clients.ts`, ~1000 lines), the quirks are:
  - The client currently used for Management API access is filtered out of writes (don't let a
    deploy lock itself out).
  - CIMD (Client ID Metadata Document) clients: changing `external_client_id` triggers
    delete+recreate rather than a patch.
  - `third_party_security_mode` is immutable after creation - PATCHing it returns 400.
  - `token_vault_privileged_access` must never round-trip - the credential IDs in it are
    tenant-specific; writing it back on import/sync causes a 400 ("missing credentials"). Must be
    stripped before any write.
  - `client_authentication_methods` / `token_endpoint_auth_method` ownership is split across
    `clients.ts` and two separate handlers (`clientAuthCredentialsPre` order 40,
    `clientAuthCredentials` order 70, `clients` order 50 default) specifically to sequence
    deletion vs. creation of credentials around the client write, avoiding PATCH rejections.
  - **None of this is implemented in the new code yet.** The new `clients/` module is
    intentionally mechanical (see Architecture below) - these quirks are deferred to a layer that
    doesn't exist yet ("the deploy scripts", one layer above the entity modules).
- Deploy-cli's dependency ordering between entity types is a flat `@order(n)` priority number per
  handler (not a real dependency graph) - e.g. `tenant` always runs last, `selfServiceProfiles`
  depends on `userAttributeProfiles`. Will need to be re-derived explicitly per entity as
  migration proceeds; the numbers themselves aren't meaningful (several collide coincidentally).
- Suggested migration sequencing from that survey (not strictly being followed - `clients` jumped
  the queue): cheap/thin-CRUD entities first (guardianPolicies, rulesConfigs, emailTemplates,
  logStreams, branding, eventStreams, customDomains, ...), then medium (databases,
  attackProtection, tenant, prompts, themes, ...), then expensive/risky last (clients, the
  clientAuthCredentials pair, connections, organizations, resourceServers/clientGrants, roles,
  rules, actions).

## Architecture - current accepted shape

Three layers, in `src/auth0/management-api/`:

1. **Pure request builders**, one file per Management API endpoint, named after the operation
   (`clients/get-client.ts`, `clients/list-clients.ts`). Each exports a synchronous function that
   takes typed params/body and returns a `RequestDescriptor` (`{ method, path, query?, body? }`,
   defined in `client.ts`). **No I/O. No `domain`/`token`. Never calls `fetch` or a client
   directly.** Types for params/bodies/responses are reused from the `auth0` npm package's
   `Management` namespace (e.g. `Management.GetClientRequestParameters`,
   `Management.Client`) rather than hand-authored, unless the SDK type is demonstrably wrong.

2. **`client.ts`** - the only file that does I/O. `createManagementApiClient({ domain, token })`
   returns `{ request<T>(descriptor) }`. Holds domain/token internally so nothing above it passes
   them per call. Knows nothing about any entity. v1 is deliberately minimal: base URL + auth
   header + query serialization + JSON parse/error handling. No retry, no rate limiting, no
   pagination in this file (see "Not started" - that's a deliberate, discussed deferral, not an
   oversight).

3. **Per-entity namespace + composition root.** `clients/index.ts` exports
   `createClientsNamespace(client: ManagementApiClient)` which wires each builder to
   `client.request(...)` and returns the entity's callable methods (today: `{ get, list }`).
   Top-level `management-api/index.ts` is the single place that knows about every entity -
   `createManagementApiClient(options)` composes the core client with each entity's namespace:
   `{ ...core, clients: createClientsNamespace(core) }`. Call site:
   ```ts
   const client = createManagementApiClient({ domain, token });
   await client.clients.get("abc123");
   await client.clients.list({ app_type: "spa" }); // see pagination note below
   ```
   Adding a new entity means writing its directory and adding one line in
   `management-api/index.ts` - `client.ts` never changes.

4. **`pagination.ts`** (top-level, sibling to `client.ts`) - `paginateAll(fetchPage, options?)`,
   a generic page-walker with zero entity knowledge. Takes a callback that fetches one page given
   `{ page, per_page }` and returns a plain array; loops until a page comes back shorter than the
   requested page size (including empty/zero - the terminal case). Default page size 100,
   overridable via `options.perPage`. Deliberately avoids `include_totals`/`total`-based
   termination because the items-array field name differs per entity's paginated envelope
   (`clients`, `users`, ...) - the length-based heuristic is entity-agnostic at the cost of one
   extra empty request when an item count happens to be an exact multiple of the page size.
   `clients/index.ts`'s `list()` uses this to always return every client, not one page - its
   exposed param type (`ListAllClientsParams`) omits `page`/`include_totals` since those are
   pagination controls the helper owns now, not meaningful caller inputs. The single-page builder
   (`buildListClientsRequest` in `list-clients.ts`) is untouched and still accepts the full
   `ListClientsParams` including `page`/`include_totals`, for anything that wants one page
   directly.

### Where entity-specific logic is and isn't allowed

This boundary was explicitly negotiated and is easy to get wrong:

- **Not allowed in a builder or namespace method:** cross-entity coordination, stripping
  tenant-specific/ephemeral fields, anything matching the deploy-cli quirks cataloged above. That
  belongs "one layer up" - in code that doesn't exist yet (referred to as "the deploy scripts").
- **Allowed, and wanted:** a builder may *refuse to build a request* (throw) to block a single
  parameter that should never be sent through that path. This was scoped narrowly to "usability
  guardrails on the shape of one call," not business logic. The only concrete example discussed:
  `create-client.ts`/`update-client.ts` should reject `client_secret` in the body (via
  `Omit<..., "client_secret">` in the type plus a runtime `if ("client_secret" in body) throw`),
  since Auth0 wants secret rotation done through the dedicated rotate-secret endpoint. **These two
  files do not currently exist** - see below.

## Explicitly rejected shapes (do not re-propose these)

Two full iterations happened before landing on the above. Both are documented here so they aren't
redone:

1. **Rejected: functions taking `domain`/`token` as explicit arguments**, with a factory
   (`createClientsApi(domain, token)`) just closing over them, and each endpoint file calling a
   shared `managementApiRequest(domain, token, method, path, body)` helper directly (mirroring the
   existing `apiManagement.ts` pattern - see "Existing conventions" below). User feedback: "I
   shouldn't have to pass a domain and token to each and every call" - rejected because every
   call site still had to thread domain/token through, even via the factory. The old shared
   helper this produced (`management-api/httpRequest.ts`) was deleted and replaced by `client.ts`.

2. **Rejected (implicitly, by the same feedback): endpoint files that build *and* execute in one
   step** (`async function getClient(client, id, params) { return client.request({...}) }`).
   Replaced by the pure-builder-plus-executor split in Architecture above, specifically so a
   builder is synchronously testable (when tests resume) without mocking `fetch`, and so a
   builder can be composed into pagination/retry logic above it without re-deriving the request
   shape.

If a future session is tempted to reach for domain/token-as-arguments again for a new entity "to
keep it simple," that's the same rejected shape - don't.

## Explicit constraints currently in force

- **No tests right now.** Tests were written for an earlier iteration (co-located `*.test.ts`
  files per module using `vitest` + `vi.stubGlobal("fetch", mockFetch)`, matching the existing
  `apiManagement.test.ts` convention) and then the user said: "Let's hold off on creating tests
  until we get an agreed-upon shape." All prior test files for this module were deleted. Do not
  add new ones until asked, even for new entity work, even though the rest of this repo tests
  almost everything.
- **`create-client.ts` and `update-client.ts` do not exist.** They were built once (with the
  `client_secret` guardrail described above) and the user removed them: "we're not ready for that
  yet." Don't recreate them until asked - `clients/index.ts` currently only exposes `get`/`list`.
- Validation approach for request bodies was explicitly decided as **TypeScript types only for
  now, no zod** - even though `userProfile.ts` elsewhere in this repo uses zod
  (`CreateUserSchema`/`PatchUserSchema`) for the same kind of thing. Revisit only if asked.

## Not started yet (named, not designed)

The user wants a short list of "canonical code sample" modules under this same umbrella -
pagination (done, see above) plus at least:

- **Rate limit handling** - deploy-cli's reference implementation (exponential backoff on 429,
  `Retry-After` header support, concurrency pool capped at 80% of Auth0's documented limit) is in
  `auth0-deploy-cli/src/tools/auth0/client.ts` (~220 lines) and was explicitly flagged as the one
  part of deploy-cli worth porting. Whether this lives inside `client.ts`'s `request()` or as a
  separate composable wrapper (mirroring how `paginateAll` ended up separate from `client.ts`)
  has not been discussed - given the pagination precedent, a separate composable piece is more
  consistent with the pattern so far, but confirm rather than assume.
- **Token caching** - this repo already has a working reference for the client-credentials side:
  `src/auth0/clientCredentials.ts` + `src/utils/deploy-cli/push-deploy.ts`'s use of
  `createFileCache` (`src/scripts/utils/fileCache.js`) and `withRetryOnInsufficientScope`
  (`src/auth0/withRetryOnInsufficientScope.ts`). Whether "token caching" here means reusing that
  existing machinery as-is, wrapping it to fit the new client's shape, or something new hasn't
  been discussed.
- An unconfirmed assumption baked into `clients/index.ts` right now: `identifierField` (e.g.
  `"client_id"`) and `isSingleton` (boolean) were added as entity metadata based on the user's
  phrase "whether the entity has an ID or not," interpreted as *singleton vs. collection
  resource* (branding/attackProtection have no ID and exactly one record per tenant, vs. clients
  being a normal collection). **This interpretation was never explicitly confirmed by the user.**
  It's low-risk for `clients` (unambiguously a collection resource either way) but will matter
  for the first singleton-shaped entity - confirm the meaning before relying on it structurally.
- The user has a standalone note at `src/auth0/management-api/actions-modules/README.md` (just a
  README, no code yet) flagging a concern for a future `actions` entity migration: action module
  version numbers need to be pulled down after deployment and reconciled with the module file,
  and "need to think about whether it should be updated in the Actions themselves." Not acted on,
  just parked.

## Existing conventions in this repo worth matching

- ESM throughout; relative imports use explicit `.js` extensions (e.g.
  `import { x } from "./y.js"`) even though the source is `.ts` - `tsconfig.json` extends
  `@tsconfig/node22/tsconfig.json`.
- Factory functions, not classes, everywhere observed in this repo
  (`createManagementApi`, `createAuthenticationApi`, `createApp`, and now
  `createManagementApiClient`/`createClientsNamespace`). No class was found anywhere in
  `src/auth0/` or `src/app/`.
- `src/auth0/apiManagement.ts` and `apiAuthentication.ts` are the pre-existing raw-`fetch`
  pattern for Management/Authentication API calls (console.log tracing, `getHeaders`,
  `handleResponse`), currently scoped to user-related operations (get/create/patch user, MFA
  enrollment, tickets, etc.). These predate `management-api/` and were the style the first
  (rejected) iteration mirrored too closely. The user said this file "will move to the app, most
  likely" - not yet done, and not the same code path as `management-api/`.
- Grep confirms the `auth0` npm SDK (`"auth0": "^6.3.0"` dependency) is used **only for its
  TypeScript types** (`Management` namespace) throughout this repo - nothing instantiates or
  calls through `ManagementClient` anywhere. That's a deliberate convention, not an oversight.
- Vitest is the test runner (`"test": "vitest run --passWithNoTests"`); when tests resume for this
  module, match the existing `vi.stubGlobal("fetch", mockFetch)` pattern from
  `apiManagement.test.ts` for anything touching `client.ts`, and plain `describe`/`it`/`expect`
  with no fetch mocking for pure builder functions (they return a plain object, nothing to mock).
- `npx tsc --noEmit` currently has one pre-existing, unrelated failure
  (`src/scripts/watch.ts(124,7)`) not caused by this work - don't try to fix it as part of this
  thread, and don't mistake it for a regression introduced here.

## How the user works on this (process notes)

- Iterates by rejecting and redirecting concretely, not by vague dissatisfaction - "I shouldn't
  have to pass domain and token to each call" led directly to the builder/executor split. When
  something feels off, expect specific, actionable pushback rather than "try again."
- Prefers confirming direction before volume: for both big shape changes so far, pointed questions
  were asked before rewriting rather than guessing - short code previews for options with a
  "shape" (call-site ergonomics, builder-vs-combined), plain options for binary/scope questions
  (validation now vs. later, minimal client vs. port rate-limiting now). Holding off and asking
  landed the right shape on the next attempt instead of a third rewrite.
- Explicitly values deferring work that isn't ready: removed create/update entirely rather than
  leaving half-built, paused on tests rather than maintaining them through an unstable shape. Read
  "we're not ready for that yet" as a real instruction, not a soft preference - don't rebuild
  what's been deliberately removed without being asked again.
