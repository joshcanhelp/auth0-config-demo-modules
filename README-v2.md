# Auth0 Demo CLI (v2)

What's actually implemented so far, end to end: scaffolding a new project with `init`, then
pulling a tenant's clients into local files with `pull`. Everything else the CLI lists
(`serve`/`validate`/`generate`/`push`/`watch`/`bulk-import`) still just throws
`"<command>" is not implemented yet` - this walks through the two commands that work today.

Run both from this repo's root with `npm run cli -- <command> ...` (there's no installed `demo`
binary yet).

## 1. Scaffold a project with `init`

```bash
npm run cli -- init
```

`init` prompts for everything it needs, in order:

1. **Project folder** - defaults to the current directory. Creates it if it doesn't exist.
2. Writes `package.json` and `serve.ts` into that folder - copied as-is from this repo's own root
   `serve.ts`, skipped if the folder already has either file.
3. **Tenant folder name** - becomes `tenants/<name>/` inside the project folder. If more than one
   tenant folder already exists, you're prompted to pick one or add a new one; if exactly one
   exists, it's used automatically.
4. **Tenant type** - `PUSH` (can deploy config changes) or `PULL` (read-only).
5. **Tenant domain** - the domain shown under Settings in the Auth0 Dashboard
   (`your-tenant.us.auth0.com`). Checked for reachability before moving on.
6. **M2M client ID and secret** - an M2M application authorized for the Management API. Verified
   live: `init` requests a token and checks its scopes, confirming `PULL` tenants only ever have
   read scopes (rejecting the client here rather than letting the first push try to prove it's
   actually read-only).

Everything collected is written to `tenants/<name>/.env`:

```bash
TENANT_TYPE="PUSH"
TENANT_DOMAIN="your-tenant.us.auth0.com"
M2M_CLIENT_ID="..."
M2M_CLIENT_SECRET="..."
```

Re-running `init` is safe - it resumes a half-configured tenant instead of starting over, and never
overwrites `serve.ts`/`package.json` if they already exist.

## 2. Pull tenant config with `pull`

```bash
npm run cli -- pull --tenant <name> --all
```

Reads live from the Auth0 Management API (via this repo's own API client, not `auth0-deploy-cli`)
and writes one JSON file per record to `tenants/<name>/<entity>/<record name>.json` - keys
alphabetized, live secrets and read-only fields stripped before anything touches disk. Never writes
back to Auth0.

**Only `clients` is implemented as a pullable entity right now.** `--all` and `--entity clients`
are equivalent today; other entities become pullable as their `management-api` module gets built
(see `packages/core/src/management-api/AGENTS.md`).

Pull modes:

```bash
npm run cli -- pull --tenant my-tenant --all              # every entity type pull supports
npm run cli -- pull --tenant my-tenant --entity clients   # one or more named entity types
npm run cli -- pull --tenant my-tenant --local            # only entity types already pulled locally
npm run cli -- pull --tenant my-tenant --file "tenants/my-tenant/clients/My App.json"
```

`--file` re-fetches just the one record that file already represents (identified by its saved
`client_id`) and overwrites it in place - its filename updates too, if the client's name changed on
the tenant since the last pull.

Omit `--tenant` and you're prompted to pick a tenant (skipped if only one exists). Omit every mode
flag (`--file`/`--entity`/`--local`/`--all`) and `pull` prompts for what to pull instead, reading
what's already local to build its menus.

## What you end up with

```
my-project/
├── package.json
├── serve.ts
└── tenants/
    └── my-tenant/
        ├── .env
        └── clients/
            ├── My App.json
            └── Another App.json
```
