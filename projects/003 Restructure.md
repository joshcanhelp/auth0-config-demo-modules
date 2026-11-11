I need to get this in the hands of the folks working here and need a path to do so. Big things getting in the way:

- Working on the system versus working on a client demo
- The modules pulled from local repos in GitHub
- Deploying all files at once for a certain entity type instead of changed files
- Generate -> import process
- New project setup

General packages/commands we need:

- **Init**
	- Spin up all the files we need
	- Prompt for tenant connection
	- Check existing tenant configuration
	- Prompt to add a new tenant
- **Serve app**
	- Rendering various pages
	- A-API calls
	- My Account API calls
	- User-focused M-API calls
- **Tenant config management**
	- Validation
		- Run all validations on local config
		- Run entity-specific validations
		- Run validation as a part of other commands
	- Pull
		- Generally
			- Read-only management API calls
		- Pull specific file
		- Pull specific entity
		- Pull local files
		- Pull local entities
		- Pull everything
	- Generate
		- Read from specific directory
		- Option to import after
	- Push
		- Push specific entities
		- Push entities without IDs to create and record the ID locally
		- Delete specific entities
	- Watch
		- Watch specific files (choose from list)
		- Prompt to update local files before watching starts
		- Watch specific entities
		- Run validation on the changed file before pushing (turn off with flag)
			- Confirm push if validation has warnings (turn off with flag)
- **Bulk import**
	- * Needs limited Management API coverage
	- Init
		- Checks for configuration
		- Checks for user source
		- Runs checks against users
	- Convert
	- Import

---

## Plan (first pass - file structure, commands, and a sample README)

Agreed direction from discussion: a single published CLI (`demo <command>`), distributed via
private GitHub with git-based installs - no npm registry, no GitHub Packages. A client repo like
`aid-demo-trading-tech` does **one** `git clone` of this repo (replacing today's three clones of
`auth0-deploy-cli`/`auth0-checkmate`/`auth0-config-demo-modules`), directly fixing the "modules
pulled from local repos" pain point above. `commander` was added as the CLI framework (this repo
had no CLI library before - every existing script hand-parses `process.argv`); it's what makes
nested subcommands, generated `--help`, and `--no-x` negation possible without hand-rolling all of
it.

This pass is **structure only** - every command exists and shows real `--help` output, but every
action throws `"<command>" is not implemented yet` (via `auth0-demo-core`'s `notImplemented()`).
The two feature-shaped pain points from the top of this doc (push-only-changed-files,
generate→import friction) are called out as **TODO** inside the relevant command's option set
(`push --changed-only`, `generate --import`) rather than solved here - they still need actual
design once that command gets built out.

### What actually moved in this pass vs. what didn't

- **Moved**: `src/auth0/management-api/` → `packages/core/src/management-api/`. This was safe to
  move as a real refactor (not a stub) because nothing consumed it yet - see
  `projects/001 Replace Deploy CLI.md`, which has been updated to point at the new path.
- **Not moved** (still at the repo root, still what actually runs today): `src/app`, `serve.ts`,
  `src/scripts`, `src/validate`, `src/generate`, `src/report`, `src/deploy`, `src/utils`, and the
  rest of `src/auth0` (`apiAuthentication.ts`, `apiManagement.ts`, `clientCredentials.ts`,
  `userProfile.ts`, `withRetryOnInsufficientScope.ts`). These are all in active use - moving them
  now would mean rewiring working code at the same time as agreeing the new shape, which is a
  separate, riskier step. Every new package's README says what it's waiting to receive and why.
- **Net new, no prior code**: `packages/bulk-import` (the whole feature) and `packages/init`.

### File structure

```
auth0-config-demo-modules/            (npm workspaces root; "workspaces": ["packages/*"])
├── package.json                      (devDeps + deps shared across the repo; "cli" script)
├── tsconfig.base.json                (shared compiler options, extended by every tsconfig.json)
├── tsconfig.json                     (root: type-checks src/, bin/, and packages/ together)
├── bin/
│   └── demo.ts                       (the CLI dispatcher - registers every package's commands)
├── packages/
│   ├── core/                         (auth0-demo-core - no commands, no CLI dependency)
│   │   ├── package.json
│   │   ├── README.md
│   │   └── src/
│   │       ├── index.ts              (public exports)
│   │       ├── notImplemented.ts     (shared stub-action helper)
│   │       └── management-api/       (moved from src/auth0/management-api/, unchanged inside)
│   │           ├── client.ts
│   │           ├── pagination.ts
│   │           ├── stripFields.ts
│   │           ├── index.ts
│   │           ├── actions-modules/README.md
│   │           └── clients/
│   │               ├── get-client.ts
│   │               ├── list-clients.ts
│   │               ├── create-client.ts
│   │               ├── update-client.ts
│   │               ├── delete-client.ts
│   │               ├── sanitize.ts
│   │               ├── index.ts
│   │               └── README.md
│   ├── init/                         (auth0-demo-init - the `demo init` command)
│   │   ├── package.json
│   │   ├── README.md
│   │   └── src/
│   │       ├── index.ts
│   │       └── commands/init.ts
│   ├── app/                          (auth0-demo-app - the `demo serve` command)
│   │   ├── package.json
│   │   ├── README.md
│   │   └── src/
│   │       ├── index.ts
│   │       └── commands/serve.ts
│   ├── tenant-config/                (auth0-demo-tenant-config - validate/pull/generate/push/watch)
│   │   ├── package.json
│   │   ├── README.md
│   │   └── src/
│   │       ├── index.ts
│   │       └── commands/
│   │           ├── validate.ts
│   │           ├── pull.ts
│   │           ├── generate.ts
│   │           ├── push.ts
│   │           └── watch.ts
│   └── bulk-import/                  (auth0-demo-bulk-import - the `demo bulk-import` subcommands)
│       ├── package.json
│       ├── README.md
│       └── src/
│           ├── index.ts
│           └── commands/bulkImport.ts   (registers init/convert/import as nested subcommands)
└── src/                               (unchanged - everything not yet moved into a package)
    ├── app/
    ├── auth0/                         (apiAuthentication.ts, apiManagement.ts, etc. - management-api/ left)
    ├── scripts/
    ├── validate/
    ├── generate/
    ├── report/
    ├── deploy/
    └── utils/
```

Dependency direction is one-way: `init`, `app`, `tenant-config`, and `bulk-import` all depend on
`core`; `core` depends on nothing in this repo. The root `bin/demo.ts` is the only file that
depends on all four command packages at once.

Root `src/` isn't itself a workspace package, so it isn't a declared dependent of `auth0-demo-core`
the way `init`/`app`/`tenant-config`/`bulk-import` are. A module moved from `src/` into
`packages/core` (e.g. `buildDashboardUrl.ts`, `clientCredentials.ts`) still gets imported back into
`src/` by a relative file path straight into `packages/core/src/`, not as the `auth0-demo-core`
package - adding it as an installed dependency of the root `package.json` just to import it that
way is the wrong fix. This goes away once root `src/` itself becomes a package.

### Commands, as actually stubbed (real `--help` output today via `npm run cli -- <command> --help`)

**`demo init`**
`--dir <path>` `--tenant <name>` `--domain <domain>` `--client-id <id>` `--client-secret <secret>`
`--tenant-type <type>` (default `PUSH`) `--yes`

**`demo serve`**
`--tenant <name>` `--port <number>`

**`demo validate`**
`--tenant <name>` `--tenant-tag <tag>` `--entity <name...>` `--show-passed` `--verbose`
`--csv <dir>`

**`demo pull`**
`--tenant <name>` `--file <path>` `--entity <name...>` `--local` `--all`

**`demo generate`**
`--tenant <name>` `--dir <path>` `--import`

**`demo push`**
`--tenant <name>` `--entity <name...>` `--changed-only` (TODO - the pain point above, not designed
yet) `--delete` `--dry-run`

**`demo watch`**
`--tenant <name>` `--file <path...>` `--entity <name...>` `--skip-pull-prompt` `--no-validate`
`--no-confirm`

**`demo bulk-import init`** - `--tenant <name>` `--source <path>`
**`demo bulk-import convert`** - `--input <path>` `--output <path>` `--format <format>`
**`demo bulk-import import`** - `--tenant <name>` `--input <path>` `--dry-run`

### Deliberately deferred (named, not designed)

- **The real `bin` entry.** `bin/demo.ts` exists and is fully wired, but it's only run today via
  `npm run cli -- <command>`. Turning it into an actual installable `demo` binary needs a decision
  this pass didn't make: ship a tsx-shebang launcher (matches how every other script in this repo
  already runs - no build step) vs. add a real build/emit step for a plain Node entry point.
- **Moving the rest of `core`'s intended contents** - Authentication API, My Account API, token/
  cache utilities, tenant selection/schema - out of the still-active root `src/` and into
  `packages/core`. Blocked on deciding whether that's a mechanical move (update import paths,
  nothing else) or a chance to also reshape those modules, and on sequencing it so `app` doesn't
  break mid-move.
- **Actually implementing each command** - wiring `validate`/`pull`/`generate`/`push`/`watch` to
  the real logic in root `src/validate`/`src/scripts`/`src/generate`, and designing
  `push --changed-only` and `generate --import` for real, are all separate follow-on tasks per
  command, not part of this structural pass.
- **`demo init`'s actual scaffolding** - what files it writes, and the exact prompt flow when
  `--yes` isn't passed - wasn't designed in this pass beyond the flag list above.

### Sample README (draft - what the root README could say once this is real; not accurate yet)

> Everything below describes the *target* state once the commands above are implemented. Today,
> every one of them throws `"<command>" is not implemented yet` - see "Deliberately deferred"
> above for what's still missing before this is true.

````markdown
# Auth0 Demo CLI

Build, configure, and run Auth0 proof-of-concept demos - entirely from local files, with nothing
published to npm. One tool handles scaffolding a new project, managing a tenant's config as local
files, running the demo app, and bulk-importing users.

## Install

No npm registry - install straight from GitHub (you'll need access to the private repo):

```bash
npm install -g git+ssh://git@github.com:your-org/auth0-config-demo-modules.git
```

This gives you the `demo` command everywhere. To update, run the same command again.

## Start a new project

```bash
demo init --dir my-client-demo
```

Prompts for your tenant's domain and an M2M client id/secret (or pass them as flags - see
`demo init --help`), then writes a new project directory with everything wired up: `package.json`,
`serve.ts`, and a `tenants/<name>` directory with your `.env`.

```bash
cd my-client-demo
demo pull --all
```

pulls down the tenant's current configuration as local files, so you have something to look at and
edit before your first push.

## Managing tenant config

Every command below prompts you to pick a tenant if you don't pass `--tenant <name>`, unless only
one tenant directory exists - then it's picked automatically.

### `demo validate`

Check your local config for problems before you push it - deprecated fields, settings Auth0 will
silently ignore, missing recommended configuration, and more.

```bash
demo validate --tenant my-tenant
demo validate --tenant my-tenant --entity clients --verbose
demo validate --tenant my-tenant --csv ./reports
```

### `demo pull`

Read your tenant's current configuration into local files. Never writes to Auth0.

```bash
demo pull --tenant my-tenant --all              # everything
demo pull --tenant my-tenant --entity clients   # just one entity type
demo pull --tenant my-tenant --local            # only what you already have locally
demo pull --tenant my-tenant --file tenants/my-tenant/clients/My\ App.json
```

### `demo generate`

Build local config files from a source directory (useful when you're templating config for a new
client rather than pulling from an existing tenant).

```bash
demo generate --tenant my-tenant --dir ./templates/retail
demo generate --tenant my-tenant --dir ./templates/retail --import   # and push it immediately
```

### `demo push`

Push your local config to the tenant. New records (no id in the file yet) are created, and their
id is written back to the file automatically.

```bash
demo push --tenant my-tenant
demo push --tenant my-tenant --entity clients
demo push --tenant my-tenant --dry-run          # see what would change, without changing anything
demo push --tenant my-tenant --delete           # also delete records that exist in the tenant
                                                 # but not locally
```

### `demo watch`

Push changes automatically as you edit local files - the fastest loop for iterating on config.

```bash
demo watch --tenant my-tenant
demo watch --tenant my-tenant --entity clients --file tenants/my-tenant/clients/My\ App.json
```

By default, `watch` offers to pull first (so you're starting from what's actually in the tenant),
validates each file before pushing it, and asks for confirmation if validation finds a warning.
Turn any of that off for a faster, noisier loop:

```bash
demo watch --tenant my-tenant --skip-pull-prompt --no-validate --no-confirm
```

## Running the demo app

```bash
demo serve --tenant my-tenant
demo serve --tenant my-tenant --port 4000
```

Serves the client list and detail pages described by your tenant's local config, and exercises
whatever each client is set up for - Authentication API login, My Account API, or user-focused
Management API calls.

## Bulk importing users

```bash
demo bulk-import init --tenant my-tenant --source ./users.csv
demo bulk-import convert --input ./users.csv --output ./users.auth0.json --format csv
demo bulk-import import --tenant my-tenant --input ./users.auth0.json --dry-run
demo bulk-import import --tenant my-tenant --input ./users.auth0.json
```

`init` checks that your tenant and source file are ready before you convert or import anything;
`convert` turns your source file into Auth0's bulk-import format; `import` runs the actual job.

## Getting help

Every command supports `--help`:

```bash
demo --help
demo push --help
demo bulk-import --help
```
````