import { strict as assert } from "node:assert";

// https://auth0.com/docs/api/authentication
export function createAuthenticationApi(
  domain: string,
  clientId: string,
  clientSecret?: string
) {
  assert(domain, "domain is required");
  assert(clientId, "clientId is required");

  const getApiUrl = (path: string) => `https://${domain}${path}`;

  const postRequest = async (path: string, body: unknown) => {
    console.log(`POST to ${getApiUrl(path)}`, body);
    try {
      return await fetch(getApiUrl(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error(`Fetch failed for POST ${getApiUrl(path)}:`, err);
      throw err;
    }
  };

  const handleResponse = async <T>(response: Response, action: string): Promise<T> => {
    const result = (await response.json()) as T & { message?: string };
    if (!response.ok) {
      throw new Error(
        `Failed to ${action}: (${response.status}) ${result.message ?? ""}`
      );
    }
    return result;
  };

  // https://auth0.com/docs/api/authentication/client-credential-flow/get-token
  const getToken = async (audience: string): Promise<Record<string, unknown>> => {
    const body = {
      client_id: clientId,
      client_secret: clientSecret,
      audience,
      grant_type: "client_credentials",
    };
    return handleResponse<Record<string, unknown>>(
      await postRequest("/oauth/token", body),
      "get token"
    );
  };

  // https://auth0.com/docs/api/authentication/multi-factor-authentication/verify-with-out-of-band
  const verifyOobCode = async (
    mfaToken: string,
    oobCode: string,
    bindingCode: string
  ): Promise<Record<string, unknown>> => {
    const body = {
      grant_type: "http://auth0.com/oauth/grant-type/mfa-oob",
      mfa_token: mfaToken,
      client_id: clientId,
      client_secret: clientSecret,
      oob_code: oobCode,
      binding_code: bindingCode,
    };
    return handleResponse<Record<string, unknown>>(
      await postRequest("/oauth/token", body),
      "verify OOB code"
    );
  };

  // https://auth0.com/docs/api/authentication/authorization-code-flow/exchange-authorization-code-for-tokens
  const exchangeCodeForToken = async (
    code: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<Record<string, unknown>> => {
    const body: Record<string, string | undefined> = {
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    };
    return handleResponse<Record<string, unknown>>(
      await postRequest("/oauth/token", body),
      "exchange code for token"
    );
  };

  // https://auth0.com/docs/api/authentication/change-password/change-password
  const changePassword = async (connection: string, email: string): Promise<void> => {
    const body = { client_id: clientId, email, connection };
    const response = await postRequest("/dbconnections/change_password", body);
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to change password: ${message}`);
    }
  };

  // https://auth0.com/docs/api/authentication/passwordless/get-code-or-link
  const startPasswordless = async (
    connection: "email" | "sms",
    send: "link" | "code",
    recipient: string,
    authParams?: Record<string, string>
  ): Promise<Record<string, unknown>> => {
    const body: Record<string, unknown> = {
      client_id: clientId,
      client_secret: clientSecret,
      connection,
      send,
      ...(connection === "email" ? { email: recipient } : { phone_number: recipient }),
      ...(authParams ? { authParams } : {}),
    };
    return handleResponse<Record<string, unknown>>(
      await postRequest("/passwordless/start", body),
      "start passwordless"
    );
  };

  return {
    getToken,
    verifyOobCode,
    exchangeCodeForToken,
    changePassword,
    startPasswordless,
  };
}
