# auth0-demo-core

Shared, dependency-light building blocks used by every other package in this repo - the pieces
that make Auth0 API calls or hold cross-cutting utility logic, with no CLI commands or
orchestration of their own. See each module's own comments for what it does.

`prompts.ts`, `tenantEnv.ts`, `tenantType.ts`, and `ui.ts` moved here from `auth0-demo-init`
unchanged - they were already fully generic (nothing init-specific in any of them), so
`auth0-demo-tenant-config` can use them too instead of duplicating them. `tenantEnv.ts`'s
`listTenantDirectories`/`readTenantEnv` are a new, independent read of a tenant's `tenants/<name>`
directory and `.env` - distinct from `selectTenant.ts` (below), which additionally
`dotenv.config()`s a tenant's `.env` into `process.env` for code that still reads it that way.

`apiAuthentication.ts` (Authentication API client), `apiManagement.ts` plus `userProfile.ts` (the
user-facing Management API surface, including the My Account-style profile schema), `jwt.ts` and
`memoryCache.ts` (token utilities - `clientCredentials.ts` already lived here), `tenantUserSchema.ts`,
and `selectTenant.ts` moved here from the repo root's `src/auth0`/`src/utils`/`src/scripts/utils` -
these are what `auth0-demo-app` needs to run the demo app without depending on anything
tenant-config-only (`auth0-deploy-cli`, `auth0-checkmate`). `selectPrompt.ts` moved alongside
`selectTenant.ts` as its only consumer but isn't re-exported from `index.ts` - it isn't needed
outside this package, and its own `SelectOption`/`parseSelection` names already collide with
`prompts.ts`'s newer `PromptSession`-based equivalents (left as-is; a mechanical move doesn't
reconcile that overlap).

Everything here is reached by subpath, not the bare package name
(`auth0-config-demo-modules/packages/core/src/index.js`) - see `bin/demo.ts`'s comment for why.
