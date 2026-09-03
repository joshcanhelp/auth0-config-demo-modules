# Guided Jounrey App modules

## Getting started

Rough notes on how to get started with a new tenant:

1. Copy `serve.ts` and `package.json` to a new directory
2. Create a `tenants` directory, then a directory with the tenant name you want to export from with `-PUSH` appended
3. Create an M2M client on the tenant (or just repurpose the "Default App" one if it's a new tenant) and grant all permissions for the Management API
4. Create a `.env` in the tenant directory you made with the following:

```bash
TENANT_DOMAIN="discounttire-dev.discounttire.auth0app.com"
M2M_CLIENT_ID="wE43MwoUElTxNSDraI4KCkndjkOFKPWT"
M2M_CLIENT_SECRET="FgUSPy4mDyzHTIFbBFNO8LRZ8gsofeB28IQm_yBiXY2M_foncHTUkFIMn8AEgOKf"

PORT=3333 # something cool and funny
AUTH0_LOG="debug"
```

5. Run `npm run export`, confirm the tenant domain, and select "All"
6. If everything is hooked up, you should see several directories appear

## Commands

All commands that interact with a tenant prompt for tenant selection unless `--tenant <name>` is passed. The flag matches the directory name with the `-PUSH`/`-PULL` suffix stripped (e.g. `--tenant my-tenant` matches `my-tenant-PUSH`). If only one tenant directory exists, selection is skipped automatically.

### `npm run export`

Exports tenant configuration from Auth0 to local files.

```
npm run export -- --tenant <name> --entity <entity>
```

### `npm run import`

Deploys local configuration files to Auth0. Only works with PUSH tenants (PULL tenants are read-only). New actions and clients are created first, then their IDs are written back to local files before the full deploy.

```
npm run import -- --tenant <name> --entity <entity>
```

### `npm run refresh`

Pulls the latest values for specific entity types from Auth0 and overwrites local files. Useful for syncing fields (e.g. `client_id`) that Auth0 manages. Only works with existing entities - use `import` to create new ones.

No `--entity` flag; selection is always interactive.

```
npm run refresh -- --tenant <name>
```

### `npm run watch`

Watches the tenant directory for file changes and automatically deploys the affected entity type on save. Only works with PUSH tenants.

```
npm run watch -- --tenant <name>
```

### `npm run start`

Starts the local Express server (defined in `serve.ts`). Configure the port via `PORT` in the tenant's `.env` file.

```
npm run start
```

### Token utility

Prints a management API access token for a tenant. Tokens are cached in `.management-token.json` inside the tenant directory and reused until expiry.

```
npx tsx src/scripts/token.ts -- --tenant <name> --show-scopes
```
