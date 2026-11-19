# Tenant Config Validation

This module takes JSON-formatted Auth0 tenant configuration and runs it through a number of checks based on the entity type (client, action, etc.). The tenant configuration data is loaded into memory for the checks so configuration from files and API endpoints should be gathered first, then passed to this validator.

This library uses [`auth0/auth0-checkmate`](https://github.com/auth0/auth0-checkmate/tree/main/analyzer/lib) for some of it's checks, then layers additional ones on top.

## Code audience

The code and validation checks here should be written to be clear to internal architects and consultants. Code comments should be concise and omitted where the code is self-explanatory. Validations that are based on online documentation from Auth0 or IETF specifications should include a URL in the comments.

## Validation codes and levels

Each validation should have a clear, human-readable code, like "clients_grants_include_implicit" that start with the entity name and only contain letters and underscores. These will eventually be used as configuration to allow for checks to be skipped.

Discoveries should be reported as one of 4 different levels:

- **Critical**: Issues that **must be** corrected before moving to production.
- **Important**: Issues that **should be** corrected but may have an allowable edge case
- **Recommended**: Issues that affect maintainability or complexity but are not security problems
- **Informational**: Things to note that may not be issues

## Commands

See the root `demo validate`/`demo validate-list` commands (`../commands/validate.ts`,
`../commands/validateList.ts`, implemented in `runValidate.ts`) for the CLI surface - options,
flags, and what each one does.

## Entity discovery

`runValidate.ts` only offers an entity if its auth0-deploy-cli export directory exists and has data - an entity with an empty or missing directory is silently skipped rather than shown as available. Most directory names match the entity name (`clients`, `custom-domains`, etc.), but email templates are the exception: auth0-deploy-cli exports them to an `emails` directory, not `email-templates`. This mapping lives in `runValidate.ts`'s `ENTITY_DIRECTORY_NAMES`.

## Skipping validations per tenant

A tenant can suppress specific findings via the `validate` key of its `.auth0vant.json` file (see
`../tenantConfigFile.ts` for where that file lives and how tenant/shared config combine):

```json
{
  "validate": {
    "skipCodes": ["tenant_settings_no_support_url"],
    "skipInstances": {
      "email_template_not_configured": ["Verification Code for Email MFA"]
    },
    "skipHardcodedValues": ["https://internal-tool.example.com"],
    "skipHardcodedVariable": ["apiKey"]
  }
}
```

- `skipCodes` suppresses a code everywhere, for every instance, across the whole tenant.
- `skipInstances` suppresses a code only for the named instances - the finding's `entityName` or `entityId` must match one of the listed identifiers. This is the way to, for example, accept that one specific email template isn't configured without silencing that check for every other template.
- `skipHardcodedValues`/`skipHardcodedVariable` are specific to the hardcoded-value checks
  (`actions_hard_coded_value_detected`, `databases_hard_coded_value_detected`) - they suppress a
  finding whenever the actual detected value or variable name matches one in the list, across
  every action/script it turns up in. Use this instead of `skipInstances` for a known value or
  variable name that's expected to recur in many places (a shared constant, a non-secret base
  URL, ...) rather than listing every instance individually. The databases check doesn't surface
  the hardcoded value itself (only the variable name), so `skipHardcodedValues` only has an effect
  on `actions_hard_coded_value_detected` findings.

A missing `validate` key (or missing file entirely) means nothing is skipped. Invalid JSON, a
non-object `validate` value, or an unrecognized code/key logs a warning and is otherwise ignored
rather than failing the run. When any findings are skipped, `runValidate.ts` reports the count in
its summary output.
