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