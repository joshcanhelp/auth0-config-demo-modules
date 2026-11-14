// The two write-path guardrails shared by create-client.ts and update-client.ts that aren't a
// flat field strip (see ../stripFields.ts for that) - both apply regardless of whether the client
// is being created or updated. Ported from auth0-deploy-cli's ClientHandler
// (auth0-deploy-cli/src/tools/auth0/handlers/clients.ts) - see
// projects/001 Replace Deploy CLI.md for which deploy-cli quirks were deliberately left out of
// this layer instead, including the ones that moved to src/validate (deprecated field renames,
// CIMD field restrictions are flagged there too - see src/validate/entity-handlers/clients/).

import { debugLog } from "../../logger.js";

function logGuardrail(message: string): void {
  debugLog(`[clients] ${message}`);
}

// jwt_configuration.secret_encoded is nested, so it can't go through the flat stripFields list.
export function stripSecretEncoded(
  body: Record<string, unknown>,
  context: string
): Record<string, unknown> {
  const jwtConfiguration = body.jwt_configuration as Record<string, unknown> | undefined;
  if (!jwtConfiguration || !("secret_encoded" in jwtConfiguration)) {
    return body;
  }

  logGuardrail(
    `stripping "jwt_configuration.secret_encoded" from ${context} - not accepted on this call`
  );
  const { secret_encoded: _secretEncoded, ...restJwtConfiguration } = jwtConfiguration;
  return { ...body, jwt_configuration: restJwtConfiguration };
}

// Auth0 requires `credentials` whenever token_vault_privileged_access is present in the write
// body, but those credentials are tenant-specific ids this app never persists - sending the
// object without them fails validation, and re-sending stale ids on a cross-tenant push is worse.
// Manage this field directly on the tenant instead. This can't be fixed by editing local config
// (the field is always stripped, regardless of content), so it stays here rather than moving to
// validate - validate only adds a visibility note (clientsTokenVaultPrivilegedAccessNotDeployable).
export function stripTokenVaultPrivilegedAccess(
  body: Record<string, unknown>,
  context: string
): Record<string, unknown> {
  if (!("token_vault_privileged_access" in body)) {
    return body;
  }

  logGuardrail(
    `stripping "token_vault_privileged_access" from ${context} - its credentials are tenant-specific and must be managed directly on the tenant, not round-tripped through config`
  );
  const { token_vault_privileged_access: _tokenVaultPrivilegedAccess, ...rest } = body;
  return rest;
}
