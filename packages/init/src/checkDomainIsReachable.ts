import { strict as assert } from "node:assert";

interface OpenIdConfiguration {
  issuer?: string;
}

// Confirms `domain` is a real, reachable Auth0 tenant by checking its OIDC discovery document,
// rather than only checking that the string looks like a domain.
export async function checkDomainIsReachable(domain: string): Promise<void> {
  const url = `https://${domain}/.well-known/openid-configuration`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error(
      `Could not reach "${domain}": ${err instanceof Error ? err.message : String(err)}`
    );
  }

  assert(
    response.ok,
    `"${domain}" does not look like an Auth0 tenant domain (GET ${url} returned ${response.status})`
  );

  const config = (await response.json()) as OpenIdConfiguration;
  assert(
    config.issuer?.startsWith(`https://${domain}`),
    `"${domain}" does not look like an Auth0 tenant domain (unexpected issuer in its OIDC configuration)`
  );
}
