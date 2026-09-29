# Reporting

This component reads tenant configuration and outputs a report in a desired format to a `reports` directory in the repo root.

## Rules

- The functions that run here MUST NOT change tenant configuration or make API calls to push or pull configuration.
- Reports that are tenant-specific MUST include the tenant name in the report name.
- Reports that are date-specific MUST include a datetime format of `YYYY-MM-DDTHH-MM-SS` in the file name

## Commands

Reports overwrite the previous report for the same tenant (where applicable), format, and report type - re-run the command to refresh a report.

- `tsx ./run.ts clients` - Creates an output file of client names, descriptions, client IDs, and application types.
  - Tenant-specific: prompts for tenant selection unless `--tenant <name>` is passed. The flag matches the tenant directory name exactly (e.g. `--tenant my-tenant` matches `tenants/my-tenant`). If only one tenant directory exists, selection is skipped automatically.
  - `--tenant {{NAME}}` - (Required unless only one tenant directory exists) Tenant name found in the `tenants` directory
  - `--format md|json` - (Optional) Format for the report, defaults to `md`
- `tsx ./run.ts user-schema` - Creates a Markdown file from the project's `user-schema.ts` file (or an error if none is found)
