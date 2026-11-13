// Generic scope guardrail, reusable by any entity's request builder. A builder passes the
// scope(s) its own operation needs; a caller passes the scopes their token actually has - or
// omits it entirely (undefined) to skip the check, e.g. when the caller doesn't track scopes at
// all. Throws before a request is ever built, rather than letting the API's own 403 be the first
// signal.
export function requireScopes(
  requiredScopes: readonly string[],
  availableScopes?: string[]
): void {
  if (availableScopes === undefined) return;

  const missing = requiredScopes.filter((scope) => !availableScopes.includes(scope));
  if (missing.length > 0) {
    throw new Error(
      `Missing required scope${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`
    );
  }
}
