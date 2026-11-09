// Generic write-path guardrail, reusable by any entity: Auth0 often rejects or ignores a write
// body that echoes back server-set/read-only fields from a GET response. Logs each field it
// removes, in gray, so a push is never silently rewriting a payload.

import chalk from "chalk";

export function stripFields(
  body: Record<string, unknown>,
  fields: readonly string[],
  context: string
): Record<string, unknown> {
  const result = { ...body };
  for (const field of fields) {
    if (field in result) {
      console.log(
        chalk.gray(`[${context}] stripping "${field}" - not accepted on this call`)
      );
      delete result[field];
    }
  }
  return result;
}
