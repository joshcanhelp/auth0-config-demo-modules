# auth0-demo-core

Shared, dependency-light building blocks used by every other package in this repo - the pieces
that make Auth0 API calls or hold cross-cutting utility logic, with no CLI commands or
orchestration of their own. See each module's own comments for what it does.

## What moves here next (not done yet)

Per `projects/003 Restructure.md`, this package is also meant to eventually hold:

- An Authentication API client (today: `src/auth0/apiAuthentication.ts` at the repo root)
- A My Account API client (doesn't exist yet)
- Token/cache utilities (`src/auth0/clientCredentials.ts`, `src/utils/jwt.ts`,
  `src/utils/memoryCache.ts`)
- Tenant selection/schema helpers (`src/scripts/utils/selectTenant.ts`,
  `src/utils/tenantUserSchema.ts`)

These are still in active use by the code that hasn't moved into a package yet (the app and the
existing `src/scripts`/`src/validate`/etc.), so moving them would require rewiring working code -
out of scope until that's done deliberately, not as a side effect of moving something else.
