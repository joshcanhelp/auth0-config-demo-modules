# CLI Command Reference

The `demo` CLI's commands are split across the packages in this directory - see each package's
own README for implementation notes. Every command below is run via:

```bash
npm run cli -- <command> [options]
```

`--help` works on any command or subcommand, e.g. `npm run cli -- init --help` or
`npm run cli -- bulk-import convert --help`.

Commands marked **not implemented** currently throw `"<command>" is not implemented yet` for
every action - their options exist and show up in `--help`, but nothing runs yet.

## `demo init`

_auth0-demo-init._ Scaffolds a new demo project and connects it to a tenant. Takes no flags -
everything but the project folder is gathered through prompts, since this is a one-off setup
step a person runs occasionally rather than something scripted or run in CI/CD. Partially
implemented: it creates the project folder, finds or creates a tenant folder (resuming one left
half-configured by an earlier run, or offering to add a new one once every existing tenant is
configured), and writes `TENANT_TYPE`/`TENANT_DOMAIN` into that tenant's `.env`. Collecting an
M2M client id/secret and checking them against the tenant is not implemented yet.

```bash
npm run cli -- init [dir]
```

`dir` is the directory to scaffold into - if omitted, it prompts for one and defaults to the
current directory.

## `demo serve`

_auth0-demo-app._ **Not implemented.** Runs the demo app against a tenant's local config -
Authentication API, My Account API, and user-focused Management API calls, depending on what each
client is configured to do.

| Option            | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `--tenant <name>` | Tenant directory name (skips interactive selection)      |
| `--port <number>` | Port to listen on, overriding the tenant's `.env` `PORT` |

## `demo validate`

_auth0-demo-tenant-config._ **Not implemented.** Runs validations against a tenant's local
config.

| Option               | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `--tenant <name>`    | Tenant directory name (skips interactive selection)               |
| `--tenant-tag <tag>` | Tag used to scope environment-specific checks, e.g. `prod`, `dev` |
| `--entity <name...>` | Limit validation to one or more entity types                      |
| `--show-passed`      | Also list validation codes that produced no findings              |
| `--verbose`          | Print each finding's code and setting below its message           |
| `--csv <dir>`        | Also write a CSV report into this directory                       |

## `demo pull`

_auth0-demo-tenant-config._ **Not implemented.** Pulls tenant config from Auth0 into local files
(read-only against the API).

| Option               | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `--tenant <name>`    | Tenant directory name (skips interactive selection)    |
| `--file <path>`      | Pull only the entity whose local file this is          |
| `--entity <name...>` | Pull only these entity types                           |
| `--local`            | Limit to entity types/files that already exist locally |
| `--all`              | Pull every entity type the tenant supports             |

## `demo generate`

_auth0-demo-tenant-config._ **Not implemented.** Generates local tenant config files from a
source directory.

| Option            | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| `--tenant <name>` | Tenant directory name (skips interactive selection)        |
| `--dir <path>`    | Directory to read source files from                        |
| `--import`        | Push the generated files immediately after generating them |

## `demo push`

_auth0-demo-tenant-config._ **Not implemented.** Pushes local tenant config to Auth0. Entities
with no local id are created and have their id written back locally.

| Option               | Description                                                                  |
| -------------------- | ---------------------------------------------------------------------------- |
| `--tenant <name>`    | Tenant directory name (skips interactive selection)                          |
| `--entity <name...>` | Limit the push to these entity types                                         |
| `--changed-only`     | Push only files changed since the last pull/push (behavior not designed yet) |
| `--delete`           | Allow deleting records that exist in the tenant but not locally              |
| `--dry-run`          | Calculate and print the changes without pushing them                         |

## `demo watch`

_auth0-demo-tenant-config._ **Not implemented.** Watches local tenant config files and pushes
changes as they're saved. By default, prompts to pull first, validates each changed file before
pushing it, and asks for confirmation if validation produces warnings.

| Option               | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `--tenant <name>`    | Tenant directory name (skips interactive selection)               |
| `--file <path...>`   | Watch only these files (prompts to choose if omitted)             |
| `--entity <name...>` | Watch only these entity types                                     |
| `--skip-pull-prompt` | Don't prompt to pull local files before watching starts           |
| `--no-validate`      | Push changed files without validating them first                  |
| `--no-confirm`       | Push even when validation produces warnings, without asking first |

## `demo bulk-import`

_auth0-demo-bulk-import._ **Not implemented.** Migrates users into a tenant from an external
source, as three subcommands.

### `demo bulk-import init`

Checks that a tenant and a user source are ready for bulk import.

| Option            | Description                                         |
| ----------------- | --------------------------------------------------- |
| `--tenant <name>` | Tenant directory name (skips interactive selection) |
| `--source <path>` | Path to the external user data source               |

### `demo bulk-import convert`

Converts a user source into Auth0's bulk import user format.

| Option              | Description                            |
| ------------------- | -------------------------------------- |
| `--input <path>`    | Path to the source file or directory   |
| `--output <path>`   | Path to write the converted file(s) to |
| `--format <format>` | Source format to convert from          |

### `demo bulk-import import`

Runs the Auth0 bulk import job against a converted user file.

| Option            | Description                                         |
| ----------------- | --------------------------------------------------- |
| `--tenant <name>` | Tenant directory name (skips interactive selection) |
| `--input <path>`  | Path to the converted user file                     |
| `--dry-run`       | Validate the file without running the import job    |
