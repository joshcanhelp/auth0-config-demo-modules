# Clients (Applications)

One file per Management API endpoint, named after the operation (`get-client.ts`,
`list-clients.ts`, `create-client.ts`, ...), each a near-literal mirror of its docs page:
https://auth0.com/docs/api/management/v2/clients

## Conventions

Each file in this directory is a pure, synchronous **request builder** for one Management API
endpoint, named after the operation (`get-client.ts`, `list-clients.ts`, `create-client.ts`,
`update-client.ts`, ...) - no I/O, no `domain`/`token`, no `fetch`. It takes whatever the docs
page's path/query parameters and request body are, and returns a `RequestDescriptor`
(`{ method, path, query, body }`, defined in `../client.ts`) for a `ManagementApiClient` to
execute.

Rules for a file in this directory:

- Build and return a `RequestDescriptor`. Never call `fetch` or a client directly - that's the
  executor's job (`../client.ts`), not an endpoint builder's.
- Reuse types from the `auth0` package's `Management` namespace for params/bodies/responses
  rather than hand-authoring them, unless the SDK's generated type is demonstrably wrong.
- A builder may refuse to build a request (throw) to block a parameter we never want sent through
  this path - e.g. `create-client.ts`/`update-client.ts` reject `client_secret`, which must be set
  through the dedicated rotate-secret endpoint instead. A builder may also strip or restrict fields
  that are purely about the shape of _this one record's_ write (server-set/read-only fields, CIMD
  routing and its editable-field restriction, `token_vault_privileged_access` - none of which a
  local config edit can fix, so there's nothing for a human to act on). That's the extent of the
  "business logic" that belongs here. Anything that spans multiple entities (diffing, exclusion
  lists, name-to-id resolution via other entities), coordinates across separate handlers (e.g. the
  ownership split between `clients` and a future `clientAuthCredentials` handler for
  `client_authentication_methods`), or represents a _fixable_ problem in local config (a deprecated
  field name, a field a CIMD client can't actually have set) belongs elsewhere instead - the former
  one layer up in the code that calls this module (the deploy scripts), the latter in
  `src/validate/entity-handlers/clients/`, which runs against local config before a deploy ever
  reaches this module. See `projects/001 Replace Deploy CLI.md` for the full history of this
  boundary.
- The generic field-stripping mechanic (`stripFields`) lives at `../stripFields.ts`, not in this
  directory - it has no entity-specific knowledge and any future entity's create/update can reuse
  it. `sanitize.ts` in this directory holds only the two guardrails still specific to clients and
  shared between `create-client.ts`/`update-client.ts` (`jwt_configuration.secret_encoded`,
  `token_vault_privileged_access`). Every guardrail logs what it changed, in gray, so a push is
  never silently rewriting a payload.

`index.ts` rolls the directory up:

- Re-exports every builder function and its types.
- Exports the canonical `Client` type.
- Exports `identifierField` (the field used to address one record) and `isSingleton` (false for
  clients - it's a normal collection resource, unlike e.g. branding or attackProtection, which
  only ever have one record per tenant and no list/create/delete).
- Exports `createClientsNamespace(client: ManagementApiClient)`, which wires each builder to
  `client.request(...)` and returns `{ get, list, create, update, delete }`. This is attached as
  `.clients` on the object `createManagementApiClient()` returns (see `../index.ts`), so a caller
  gets one client instance bound to a domain/token and never touches a builder or a descriptor
  directly: `client.clients.get(id)`, `client.clients.list(params)`.
- `list` always fetches every client across all pages via `paginateAll` (`../pagination.ts`) - a
  generic, entity-agnostic page-walker reused by any other entity's `list`. Its exposed params
  type omits `page`/`include_totals` since those are pagination controls the helper owns, not
  meaningful inputs for "give me everything."

## Endpoints

- `get-client.ts` - `GET /clients/:id`
- `list-clients.ts` - `GET /clients` (single page; `index.ts`'s `list()` walks every page)
- `create-client.ts` - `POST /clients`, or `POST /clients/cimd/register` for a CIMD client
- `update-client.ts` - `PATCH /clients/:id`
- `delete-client.ts` - `DELETE /clients/:id`
