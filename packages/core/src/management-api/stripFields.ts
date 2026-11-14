// Generic field-removal mechanic, reusable by any entity on either a write path (Auth0 often
// rejects or ignores a write body that echoes back server-set/read-only fields from a GET
// response) or a read path (keeping a live secret out of what gets written to local config). Logs
// each field it removes - only visible with AUTH0_LOG=debug (see ../logger.ts), since this fires
// on every single call and would just be noise otherwise.

import { debugLog } from "../logger.js";

export function stripFields(
  body: Record<string, unknown>,
  fields: readonly string[],
  context: string,
  reason = "not accepted on this call"
): Record<string, unknown> {
  const result = { ...body };
  for (const field of fields) {
    if (field in result) {
      debugLog(`[${context}] stripping "${field}" - ${reason}`);
      delete result[field];
    }
  }
  return result;
}
