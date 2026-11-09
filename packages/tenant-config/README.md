# auth0-demo-tenant-config

The `demo validate`, `demo pull`, `demo generate`, `demo push`, and `demo watch` commands -
everything to do with managing a tenant's config as local files, outside of a push/deploy.

Stub only - the real logic still lives at the repo root (`src/validate`, `src/scripts`,
`src/generate`, `src/report`, `src/deploy`) and is unaffected by this package. See each file under
`src/commands/` for its planned flags and `projects/003 Restructure.md` for the full plan this
package is part of, including the two pain points this package is meant to fix
(`push --changed-only`, and `generate --import`).
