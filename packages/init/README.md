# auth0-demo-init

The `demo init` command - scaffolds a brand-new project directory and connects it to a tenant.
This is the only command meant to be runnable with nothing else cloned yet (see the root CLI's
`bin/demo.ts` for how that's wired).

Running it writes `package.json` and `serve.ts` into the project directory (`serve.ts` copied
as-is from this repo's own root `serve.ts` - both import via the same
`auth0-config-demo-modules/src/...` package specifier, resolved here through this repo's own
package self-reference and in a scaffolded project through its `auth0-config-demo-modules`
dependency) - skipped if the project already has either file - then walks through connecting a
`tenants/<name>` directory to an Auth0 tenant: tenant type, domain, and M2M client credentials,
saved to that tenant's `.env`.

A scaffolded project's `package.json` defaults that dependency to
`file:../auth0-config-demo-modules` (a sibling checkout, so local edits there take effect without
reinstalling), and can switch it with a single command either way, no release/version/publish
step involved:

- `npm run modules:local` - back to the sibling checkout (the default)
- `npm run modules:remote` - this repo's `main` branch on GitHub directly, so a push there can
  reach a deploy on its next build; run it before the deploy's own `npm install`

Not yet implemented: the `user-schema.ts` file and the rest of the flags listed in
`projects/003 Restructure.md`, which has the full plan this package is part of.
