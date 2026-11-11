// Fields the Management API returns on get/list that never belong in a local config file: either
// a live secret (client_secret, signing_keys - real certs/keys, not placeholders) or genuinely
// read-only/deprecated fields Auth0 itself never accepts back on create/update (global, tenant,
// custom_login_page_preview, config_route, owners, callback_url_template, cross_origin_auth - the
// deprecated alias of cross_origin_authentication, promoted onto that field by
// promoteDeprecatedCrossOriginAuth below before this list drops it). Ported from
// auth0-deploy-cli's readOnlyFields.clients list (auth0-deploy-cli/src/readonly.ts) - see
// projects/001 Replace Deploy CLI.md for which deploy-cli quirks were deliberately left out of this
// layer instead.
//
// created_at/updated_at are deliberately NOT here - unlike the above, they're worth keeping in
// local config for reference. create-client.ts/update-client.ts already strip them independently
// before either call reaches the API, so they're never sent back regardless of what's on disk.
export const CLIENT_EXPORT_EXCLUDED_FIELDS = [
  "client_secret",
  "callback_url_template",
  "signing_keys",
  "global",
  "tenant",
  "custom_login_page_preview",
  "config_route",
  "owners",
  "cross_origin_auth",
] as const;

// Ported from auth0-deploy-cli's sanitizeCrossOriginAuth: Auth0 still returns the deprecated
// cross_origin_auth field on get/list for backward compatibility. Must run before
// CLIENT_EXPORT_EXCLUDED_FIELDS strips cross_origin_auth - carries its value onto
// cross_origin_authentication first if that field isn't already present, so a client old enough to
// only have the deprecated field doesn't silently lose the setting when the alias is dropped.
export function promoteDeprecatedCrossOriginAuth(
  client: Record<string, unknown>
): Record<string, unknown> {
  if (!("cross_origin_auth" in client) || "cross_origin_authentication" in client) {
    return client;
  }
  return { ...client, cross_origin_authentication: client.cross_origin_auth };
}
