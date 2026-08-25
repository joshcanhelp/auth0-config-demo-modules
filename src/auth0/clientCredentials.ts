const EXPIRY_BUFFER_SECONDS = 60;

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope?: string;
}

export interface TokenCache {
  read(): string | null;
  write(accessToken: string, expiresAt: number): void;
  clear(): void;
}

export async function getClientCredentialsToken(
  domain: string,
  clientId: string,
  clientSecret: string,
  options?: { audience?: string; cache?: TokenCache }
): Promise<string> {
  const cached = options?.cache?.read();
  if (cached) {
    return cached;
  }

  const response = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience: options?.audience ?? `https://${domain}/api/v2/`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to get client credentials token: ${body}`);
  }

  const data = (await response.json()) as TokenResponse;

  options?.cache?.write(
    data.access_token,
    Date.now() + (data.expires_in - EXPIRY_BUFFER_SECONDS) * 1000
  );

  return data.access_token;
}

export async function getClientCredentialsTokenResponse(
  domain: string,
  clientId: string,
  clientSecret: string,
  options?: { audience?: string }
): Promise<TokenResponse> {
  const response = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience: options?.audience ?? `https://${domain}/api/v2/`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to get client credentials token: ${body}`);
  }

  return (await response.json()) as TokenResponse;
}
