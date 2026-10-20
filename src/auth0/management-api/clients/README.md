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
  through the dedicated rotate-secret endpoint instead. That's the extent of the "business logic"
  that belongs here: usability guardrails on the shape of a single call. Anything that spans
  multiple entities, strips tenant-specific/ephemeral fields, or coordinates with another handler
  (the kind of quirk cataloged for deploy-cli's `clients.ts`) still belongs one layer up, in the
  code that calls this module (the deploy scripts).

`index.ts` rolls the directory up:

- Re-exports every builder function and its types.
- Exports the canonical `Client` type.
- Exports `identifierField` (the field used to address one record) and `isSingleton` (false for
  clients - it's a normal collection resource, unlike e.g. branding or attackProtection, which
  only ever have one record per tenant and no list/create/delete).
- Exports `createClientsNamespace(client: ManagementApiClient)`, which wires each builder to
  `client.request(...)` and returns `{ get, list }` today (create/update will come back once
  we've agreed on their shape). This is attached as `.clients` on the object
  `createManagementApiClient()` returns (see `../index.ts`), so a caller gets one client instance
  bound to a domain/token and never touches a builder or a descriptor directly:
  `client.clients.get(id)`, `client.clients.list(params)`.
- `list` always fetches every client across all pages via `paginateAll` (`../pagination.ts`) - a
  generic, entity-agnostic page-walker reused by any other entity's `list`. Its exposed params
  type omits `page`/`include_totals` since those are pagination controls the helper owns, not
  meaningful inputs for "give me everything."

## Endpoints