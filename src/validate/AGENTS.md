# Agent Instructions - Validate Component

This extends the root `AGENTS.md`. It scopes the "Write/Update Tests" step of the
after-each-coding-block checklist for this directory only; the rest of the root
checklist (build, test, lint, format, docs) still applies as-is.

## Testing scope

Most checks here call a function from `auth0-checkmate`, which has its own test
suite covering whether a given tenant config triggers that check. Do not write
tests that just re-verify a checkmate check fires - that duplicates coverage that
already exists upstream.

Do write tests for logic added on top of a checkmate result, for example:

- Code, level, and message mapping (the `DEFINITIONS` map and how a handler applies it)
- Tenant-tag-based suppression (e.g. `if (tenantTag === "dev") break;`)
- Any other project-specific conditional, such as excluding known client names from a check

If an entity handler only forwards a checkmate check's result to a `Finding` with
no added conditions, it does not need a test file.
