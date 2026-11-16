# auth0-demo-app

The `demo serve` command - the Express demo app that renders client pages and exercises
Authentication API, My Account API, and user-focused Management API calls on their behalf.

Stub only - the real app still lives at the repo root (`src/app`, `serve.ts`) and is unaffected by
## `createApp(tenantDir)`

Builds the Express app for one tenant directory - session, static files, locals, and
tenant-aware client middleware - and registers two routes that never vary across demos: `/` (the
client list) and `/error-page`. Returns:

| Key                           | What it is                                                       |
| ----------------------------- | ---------------------------------------------------------------- |
| `app`                         | The Express app                                                  |
| `TENANT_DIR`                  | Resolved absolute path to the tenant directory                   |
| `baseUrl`                     | This app's own base URL, from `.env` / `DEPLOYED_APP_URL`        |
| `tenantUserSchema`            | The tenant's parsed `user-schema.ts`, or `null`                  |
| `tenantUserSchemaFields`      | Flattened fields from that schema, ready to render as a form     |
| `anyClientMiddleware`         | Looks up `:clientId` into `res.locals.client`, 404s if not found |
| `loginableClientMiddleware`   | Same, restricted to clients configured for login                 |
| `createUsersClientMiddleware` | M2M-authenticates for the `create:users` grant                   |
| `readUsersClientMiddleware`   | M2M-authenticates for the `read:users` grant                     |

## Route handlers and page renderers

Each of these takes `{ request, response, env }` (some take `{ response, env }` only) and handles
one route: `handleChangePasswordEmail`, `handleChangePasswordLink`, `handleVerifyEmail`,
`handleLoginRedirect`, `handleLogout`, `handleCreateUser`, `handleSearchUsers`,
`handleStoreIdToken`, `handleSessionTransfer`, `renderClientPage`, `renderCallbackPage`. Also
exported: `detectLoginMethod` (backend vs. frontend/SPA, per client) and `resolveBaseUrl`.

## Wiring a project's `serve.ts`

```ts
import {
  createApp,
  handleLoginRedirect,
  renderCallbackPage,
  resolveBaseUrl,
  // ...
} from "auth0-config-demo-modules/packages/app/src/index.js";

const { app, loginableClientMiddleware /* ... */ } = await createApp(tenantDir);

app.get("/login/:clientId", loginableClientMiddleware, (request, response) => {
  return handleLoginRedirect({ request, response, env: process.env });
});
// ...
app.listen(port, () => {
  console.log(`Server running at ${resolveBaseUrl(process.env)} on port ${port}`);
});
```

Each project declares its own route list this way - which paths exist, in what order, with what
middleware - so it can add custom behavior or comments around any of them, skip ones it doesn't
need, or mount its own extra routes alongside. `aid-demo-trading-tech`'s `serve.ts` is an example:
a reduced route list, plus its own mock backend API routes mounted alongside.

## Session delegation

`renderCallbackPage` takes an optional `sessionDelegationIdTokenClaim` option: the name of an ID
token claim carrying a session-delegation subject token (one user acting as another - e.g.
`aid-demo-trading-tech`'s `impersonation_subject_jwt`). When that claim is present on login, this
module renders the "Continue session delegation" callout and its link to `/session-transfer`
itself - a project just names the claim.

This only applies to backend login flows, since the exchange happens server-side via
`/session-transfer`; passing it for a frontend (SPA) client throws. A project whose callback route
serves multiple client types should check `detectLoginMethod(...) === "backend"` itself before
passing the option, the way `aid-demo-trading-tech`'s `serve.ts` does.

## Dependencies

Depends on `auth0-demo-core` and `express`/`express-session` only - running or deploying this app
never needs `auth0-deploy-cli` or `auth0-checkmate` installed.
