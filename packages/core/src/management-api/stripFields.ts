// Generic field-removal mechanic, reusable by any entity on either a write path (Auth0 often
// rejects or ignores a write body that echoes back server-set/read-only fields from a GET
// response) or a read path (keeping a live secret out of what gets written to local config). Logs
// each field it removes, in gray, so a write-path strip is never silently rewriting a payload -
// pass `quiet: true` to skip that where there's nothing a human needs to know about (e.g.
// stripping a secret on every single pull would just be noise).

import chalk from "chalk";

export function stripFields(
  body: Record<string, unknown>,
  fields: readonly string[],
  context: string,
  options?: { reason?: string; quiet?: boolean }
): Record<string, unknown> {
  const reason = options?.reason ?? "not accepted on this call";
  const result = { ...body };
  for (const field of fields) {
    if (field in result) {
      if (!options?.quiet) {
        console.log(chalk.gray(`[${context}] stripping "${field}" - ${reason}`));
      }
      delete result[field];
    }
  }
  return result;
}
