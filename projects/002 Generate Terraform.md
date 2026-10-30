# Generate Terraform - context for picking up this thread

Audience: an agent resuming this work with no prior conversation history. This is not
documentation of what exists (read the actual files for that) - it's the decisions, rejected
approaches, and open questions that produced the current state, which aren't recoverable from the
files alone. Re-read the actual files before acting on anything below; the user edits code directly
between sessions and this doc will drift.

## The goal

Define Auth0 tenant configuration as Terraform and push it to a (currently unnamed) repo. **Which
repo was never specified** - the user's original ask was "push that to a specific repo" but didn't
name one. Don't assume this stays in `aid-demo-discounttire` long-term; confirm before any actual
push/PR of finished Terraform config.

## Why `auth0 terraform generate` instead of converting the local deploy-cli JSON

This repo already has deploy-cli-format JSON exports under `tenants/<name>/`. Converting those to
Terraform was considered and rejected: that JSON format doesn't map cleanly onto the `auth0/auth0`
Terraform provider's resource schema (different shape for relationships, IDs, secrets) - a converter
would be reimplementing the provider's own schema logic. The Auth0 CLI's `auth0 terraform generate`
(aliases `auth0 tf generate`/`gen`) does this correctly by introspecting the live tenant via the
Management API and emitting real provider-schema HCL plus Terraform `import` blocks. This is the
accepted approach going forward - don't revisit the JSON-conversion idea unless something about
`terraform generate` turns out to be unworkable.

## Auth0 CLI auth - Private Cloud gotcha

This tenant is on Auth0 Private Cloud. `auth0 login`'s default browser/device-code flow is **not
supported for Private Cloud** - it authenticates against Auth0's public authorization server, not
the private instance, so it looks like it's "sending you to the wrong instance" (it is, for private
instances that's just not how user login works). The fix is machine login instead:

```bash
auth0 login --domain <tenant-domain> --client-id <client-id> --client-secret <client-secret>
```

This reuses the existing M2M app in `tenants/discounttire-dev/.env` (`TENANT_DOMAIN`,
`M2M_CLIENT_ID`, `M2M_CLIENT_SECRET`) - the same credentials `push-deploy.ts` already uses
successfully for Management API access, so no new M2M app was created.

## Terraform provider credentials are separate from the Auth0 CLI's own auth

`auth0 terraform generate` scans the tenant using the CLI's own auth (above), but the later
`terraform plan -generate-config-out=...` / `apply` steps shell out to the actual `terraform`
binary, which needs the `auth0` **provider's** own credentials in the environment - unrelated to
the CLI login. The provider reads:

- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`

`terraform/load_env.sh` maps these from a tenant's `.env` file (`TENANT_DOMAIN` /
`M2M_CLIENT_ID` / `M2M_CLIENT_SECRET`). **It must be sourced, not executed** (`source
load_env.sh <tenant-folder-name>`, not `./load_env.sh`) - `export` in an executed script only
affects the subshell it runs in and the vars vanish immediately; this bit the user once already.
It takes the tenant folder name as an optional first arg (default `discounttire-dev`), resolved
against `tenants/<name>/.env`, anchored to the script's own location so it works regardless of
the caller's cwd (an earlier version used a cwd-relative path and silently broke when sourced from
anywhere but `terraform/`).

## What `terraform generate` / `plan -generate-config-out` do and don't touch

Documented here because the user was specifically concerned about accidentally writing to the live
tenant:

- `terraform init` - local only (downloads the provider plugin), no tenant interaction.
- `terraform plan -generate-config-out=<file>` - makes **read-only** Management API calls (GETs)
  to fetch current state for everything named in `import` blocks, then writes matching HCL to the
  given file. Does not modify the tenant.
- `terraform apply` - the only step that can write. After an import-blocks-plus-generated-config
  plan, a clean apply should only touch local Terraform state (binds existing resources to state,
  no API writes) - but only if the generated config exactly matches live reality; any drift means
  apply will try to "correct" it with a real write. **`apply` has not been run in this project.**
  Before ever running it: the plan output must show only imports, with 0 to add / 0 to change / 0
  to destroy. Don't run `apply` without the user explicitly re-confirming at that point, even if a
  plan looks clean.

## What's been generated and how it's organized now

Ran `auth0 terraform generate` + `terraform init && terraform plan
-generate-config-out=auth0_generated.tf` against **discounttire-dev** (the only tenant actually
scanned so far). Produced 97 resources across 24 `auth0_*` resource types - see
`terraform/reference/dev/auth0_generated.tf` for the untouched original.

Split that single 3700-line file into per-entity files with a one-off Python script (brace-depth
string-aware splitter, written to the session scratchpad, not committed - it's a migration utility,
not a maintained tool; rerunning the split later means rewriting it or grabbing it from this
session's history). Splitting was safe to do with simple brace counting because the generated file
has **no heredocs** - every multi-line value (email template bodies, action JS code) comes out as a
single-line string with `\n` escapes, confirmed by grep before relying on this. Verified nothing was
lost or corrupted via `terraform fmt` (parses successfully, no diff) and a resource-count match
(97 in, 97 out) before deleting anything.

Current layout, following the standard shared-module-plus-per-environment-roots pattern (the
standard approach for one Terraform config managing several independent tenants/accounts that each
need their own provider credentials):

- **`terraform/modules/auth0-tenant/`** - the shared module. Has its own `versions.tf`
  (`required_providers` only - no `provider "auth0" {}` block; provider config belongs to each
  environment root) and a `variables.tf` (see "Variabilization" below).
- **`terraform/environments/qa/`** - the **only** environment root, by explicit instruction (see
  below). `main.tf` has the `terraform`/`provider` blocks and a `module "auth0_tenant"` call that
  passes through all eight module variables; `variables.tf` declares matching root-level variables;
  `terraform.tfvars` currently holds **dev's values copied verbatim as a placeholder** (see below).
  **Explicitly not ready to `apply`** - see "Not started" below for what's still missing.
- **No `stage`/`prod` directories, no tfvars placeholders for them, nothing scaffolded.** An
  earlier pass in this same session created `environments/stage/` and `environments/prod/` with
  tfvars placeholders - **the user explicitly rejected this**: "I didn't want any other environments
  besides QA." Those directories were deleted. **Do not recreate them unasked** - dev stays managed
  via direct API/deploy-cli push, and stage/prod aren't on the table until the user asks for them by
  name. Don't infer "QA validated, so scaffold stage next" from the earlier "as each environment is
  validated" phrasing - that framing was superseded by this correction.

## Variabilization (done, based on dev only - not yet reconciled against real QA data)

User explicitly overrode the original plan ("don't extract anything else, just define them based on
dev, then create files for the other environments") - **do not re-block on getting QA's own
`terraform generate` output before touching variables again.** A first pass at this used a shared
`client_ids` map variable and shared brand-level login-domain variables threaded through every
client's callback/logout URLs - **the user then explicitly corrected this** ("client IDs should
remain hard-coded in the URLs, not as variables. Each application will need its own variables for
callbacks, logout URLs, and the login URI"). The `client_ids` map was removed entirely and
everything was redone per the design below - if resuming this work, the **current** design is what's
described here, not the `client_ids`-map version (don't resurrect it from git history or an older
memory of this session without being asked).

Current design:

- **Eight module variables, none with a `default`** - user explicitly required this ("None of the
  variable definitions should have a default. Those should all be defined per-env"), so every value
  lives only in `environments/qa/terraform.tfvars` (currently dev's values copied as a placeholder -
  see below). **Don't add defaults back to `modules/auth0-tenant/variables.tf` even for convenience
  during testing** - that was a deliberate removal, not an oversight. Five are tenant/shared-level:
  `tenant_domain`, `login_domain_discounttire`, `login_domain_americastire`, `deployed_app_url`,
  `tenant_friendly_name`. Three are **per-application** maps, keyed by the
  `auth0_client` resource's Terraform name (e.g. `callbacks["web_application_discount_tire"]`),
  covering only the 6 clients that actually have these populated (the other 6 are
  non-interactive/M2M clients with empty `callbacks`/`allowed_logout_urls` and no
  `client_metadata.login_domain` - left as literal `[]`/absent, not worth a variable for emptiness):
  - `callbacks` (`map(list(string))`)
  - `allowed_logout_urls` (`map(list(string))`)
  - `login_uris` (`map(string)`) - maps to each client's `client_metadata.login_domain` field.
    **Open interpretation call**: the user said "the login URI" without naming the exact attribute.
    This was read as `client_metadata.login_domain` (present uniformly across all 6 application
    clients) rather than the actual Auth0 `initiate_login_uri` attribute (present on only 2 of the
    6, with inconsistent-looking values - one external marketing URL, one reusing the deployed app
    URL). `initiate_login_uri` was left untouched as a literal/as whatever the generic domain
    substitution produced. **If this interpretation is wrong, swap `login_uris` to drive
    `initiate_login_uri` instead** - confirm with the user rather than guessing further.
  - **Every URL in `callbacks`/`allowed_logout_urls` defaults are fully literal dev values,
    including each client's own client ID embedded in the path** (e.g.
    `.../callback/kiHK6vaqtLuMUrSvCFflt3gc6i8AWCxt`) - no interpolation of `var.client_id` or
    `var.deployed_app_url` inside these two variables' defaults, per the explicit "hard-coded in the
    URLs" instruction. This is a deliberate asymmetry: `deployed_app_url` IS still used as a shared
    variable elsewhere (`tenant.tf`'s own `allowed_logout_urls`, `branding.tf`'s CSS background
    image, and each client's `allowed_origins`/`initiate_login_uri` fields) - just not inside the
    `callbacks`/`allowed_logout_urls` map defaults themselves.
- **Client IDs are 100% literal everywhere now** - `auth0_client.client_id`,
  `auth0_client_credentials.client_id`, `auth0_client_grant.client_id`,
  `connection_clients.enabled_clients` list entries, and the callback-URL path segments. No
  `client_ids` variable exists. This still leaves the "import existing vs. create new in QA"
  question completely open for clients specifically - see "Not started" below.
- **Connection IDs still don't use a variable** - unaffected by the correction above.
  `auth0_connection` resources have no settable `id`/`connection_id` attribute at all (purely
  computed), so `connection_clients.tf`'s `connection_id` field uses a native resource reference
  (`auth0_connection.main.id` / `auth0_connection.main_import_test.id`) instead. Automatically
  correct in any environment with zero config - keep this as-is.
- Mechanics: a generic one-off Python script (scratchpad, not committed) does a two-pass
  literal-string substitution per file for the five shared/tenant-level variables only - first pass
  swaps a value that's the *entire* quoted string for a bare `var.x` reference, second pass catches
  the same literal still embedded inside a larger string (e.g. a URL) and wraps it as `${var.x}`.
  **Comment lines (`# __generated__ by Terraform from "..."`) are explicitly skipped** by this
  script - an earlier run (back when `client_ids` still existed) did a blind substitution that
  corrupted these into nonsense (e.g. a connection's traceability comment became `... from
  auth0_connection.main.id` instead of the real `con_...` ID). Fixed by regenerating split files
  fresh from `reference/dev/auth0_generated.tf` and re-running a comment-aware version. If this
  script is ever rerun or adapted, keep the comment-skip. The three per-application maps are instead
  built with a second, separate script that finds each named client's resource block and
  swaps its `allowed_logout_urls =`, `callbacks =`, and `login_domain =` lines directly - run this
  *after* the generic substitution pass, since it overrides what that pass would otherwise do to
  those same lines.
- Verified after each pass with `terraform fmt -check -recursive` (exit 0, no diffs) and a
  97-resource count match against `reference/dev/auth0_generated.tf`.
- `environments/qa/terraform.tfvars` currently duplicates the module's dev-sourced defaults
  exactly - adds no new information yet, just gives QA a file to edit in place once its real values
  are known.
- **`terraform/reference/dev/`** - the original, unsplit generate output (`auth0_main.tf`,
  `auth0_generated.tf`, `auth0_import.tf`) for discounttire-dev. Kept only as a diffable reference
  for what the module was derived from; not loaded by Terraform (not a module source, not an
  environment root). Could be deleted once the module's eventual parameterization is confirmed
  to still match dev's real values - hasn't been needed for that yet, don't delete without checking.
- **`terraform/load_env.sh`** - see credentials section above.
- **`terraform/.gitignore`** - ignores `.terraform/` and `*.tfstate*` only. **Deliberately does
  NOT ignore `*.tfvars`** - per-environment tfvars files are meant to hold non-secret config and
  be committed (that's the actual point of pulling environment differences into variables);
  secrets only ever flow through the `AUTH0_*` env vars via `load_env.sh`, never through tfvars.
  (First draft of this file blanket-ignored tfvars - caught and reverted in the same session
  before it was ever relied on, since it would have silently defeated the whole point.)

## Not started yet (named, not designed)

- **No `tenants/discounttire-qa/` (or stage/prod) folder exists in this repo.** Only
  `discounttire-dev` and `discounttire-demo` exist under `tenants/`. QA's tenant domain and M2M
  Management API credentials need to be sourced (or a new M2M app created in QA) before any
  QA-specific Terraform work can proceed - including just running `auth0 terraform generate`
  against QA to see its real current state.
- **Whether QA's clients get imported or created fresh is still unresolved**, and it matters:
  `client.tf` hard-codes each client's `client_id` as a literal (dev's real value). If QA's clients
  already exist (import), those literals need to become QA's *real* IDs before `apply` - the import
  will then bind them correctly, and the callback URLs in `callbacks`/`allowed_logout_urls` need
  updating to match (same literal-ID-in-URL pattern, QA's values). If QA's clients need to be
  created fresh via Terraform, hard-coding any `client_id` value may not even be valid (Auth0
  assigns client IDs server-side on create) - that would mean leaving `client_id` unset for a create
  path, which also means the callback URLs can't know the real ID ahead of time (chicken-and-egg,
  not solved here). Don't assume either direction - ask before doing the QA import/create work.
- Email template bodies, action code, connection `options` blocks, etc. were **not** scanned for
  further environment-specific content beyond the tenant domain and the two login custom domains
  (both already variablized). If something else turns out to differ for QA (e.g. a different C360
  endpoint), that's a new variable to add then, not something pre-emptively hunted for now - this
  was an explicit scope cut, not an oversight.
- **Import-block addressing changes once resources live in a module.** `reference/dev/auth0_import.tf`
  addresses resources as bare `<type>.<name>` (e.g. `auth0_action.post_login_01_link_to_c360`).
  Any import blocks written for QA (or any future environment) must address them through the module
  instead: `module.auth0_tenant.<type>.<name>`. Don't copy dev's import file addressing verbatim.
- Auth0 CLI version in use: 1.26.0. Terraform CLI: 1.15.8 (locally installed; a newer 1.17.1 exists
  but hasn't been evaluated - no reason found yet to upgrade).
