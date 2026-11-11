# auth0-demo-core

Shared, dependency-light building blocks used by every other package in this repo - the pieces
that make Auth0 API calls or hold cross-cutting utility logic, with no CLI commands or
orchestration of their own. See each module's own comments for what it does.

`prompts.ts`, `tenantEnv.ts`, `tenantType.ts`, and `ui.ts` moved here from `auth0-demo-init`
unchanged - they were already fully generic (nothing init-specific in any of them), so
`auth0-demo-tenant-config` can use them too instead of duplicating them. `tenantEnv.ts`'s
`listTenantDirectories`/`readTenantEnv` are a new, independent read of a tenant's `tenants/<name>`
directory and `.env` - distinct from the legacy `src/scripts/utils/selectTenant.ts` at the repo
root (still used by `serve.ts`/`createApp.ts`, and not touched here), which additionally
`dotenv.config()`s a tenant's `.env` into `process.env` for code that still reads it that way.

## What moves here next (not done yet)

Per `projects/003 Restructure.md`, this package is also meant to eventually hold:

- An Authentication API client (today: `src/auth0/apiAuthentication.ts` at the repo root)
- A My Account API client (doesn't exist yet)
- Token/cache utilities (`src/utils/jwt.ts`, `src/utils/memoryCache.ts` - `clientCredentials.ts`
  already lives here)
- `src/scripts/utils/selectTenant.ts` itself, and `src/utils/tenantUserSchema.ts`

These are still in active use by the code that hasn't moved into a package yet (the app and the
existing `src/scripts`/`src/validate`/etc.), so moving them would require rewiring working code -
out of scope until that's done deliberately, not as a side effect of moving something else.
