import { z } from "zod";

import { CreateUserSchema, PatchUserSchema } from "./userProfile.js";
import type { CreateUserBody, PatchUserBody } from "./userProfile.js";

interface ManagementApiOptions {
  userSchema?: z.ZodType;
}

// https://auth0.com/docs/api/management/v2
export function createManagementApi(
  domain: string,
  token: string,
  options?: ManagementApiOptions
) {
  const userSchema = options?.userSchema;
  const patchUserSchema = userSchema
    ? (userSchema as z.ZodObject<z.ZodRawShape>).partial()
    : PatchUserSchema;
  const getApiUrl = (apiPath: string) => `https://${domain}/api/v2${apiPath}`;

  const getHeaders = (extra: Record<string, string> = {}) => ({
    Authorization: `Bearer ${token}`,
    ...extra,
  });

  const handleResponse = async <T>(response: Response, apiPath: string): Promise<T> => {
    const result = (await response.json()) as T & { message?: string };
    if (!response.ok) {
      throw new Error(
        `Failed to ${apiPath}: (${response.status}) ${result.message ?? ""}`
      );
    }
    return result;
  };

  const getRequest = (apiPath: string) => {
    console.log(`GET to ${apiPath}`);
    return fetch(getApiUrl(apiPath), { headers: getHeaders() });
  };

  const postRequest = (apiPath: string, body: unknown) => {
    console.log(`POST to ${apiPath}`, body);
    return fetch(getApiUrl(apiPath), {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
  };

  const patchRequest = (apiPath: string, body: unknown) => {
    console.log(`PATCH to ${apiPath}`, body);
    return fetch(getApiUrl(apiPath), {
      method: "PATCH",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
  };

  const deleteRequest = (apiPath: string) => {
    console.log(`DELETE to ${apiPath}`);
    return fetch(getApiUrl(apiPath), {
      method: "DELETE",
      headers: getHeaders(),
    });
  };

  // https://auth0.com/docs/api/management/v2/users/get-users-by-id
  const getUser = async (userId: string): Promise<Record<string, unknown>> => {
    const apiPath = `/users/${encodeURIComponent(userId)}`;
    return handleResponse<Record<string, unknown>>(await getRequest(apiPath), apiPath);
  };

  // https://auth0.com/docs/api/management/v2/users/get-users
  const getUsers = async (query: string): Promise<Record<string, unknown>[]> => {
    const params = new URLSearchParams();
    params.append("q", query);
    params.append("search_engine", "v3");
    params.append("include_fields", "true");
    params.append("fields", "name,user_id,email,username,identities,app_metadata");
    const apiPath = `/users?${params.toString()}`;
    return handleResponse<Record<string, unknown>[]>(await getRequest(apiPath), apiPath);
  };

  // https://auth0.com/docs/api/management/v2/users/patch-users-by-id
  const patchUser = async (
    userId: string,
    body: PatchUserBody
  ): Promise<Record<string, unknown>> => {
    const apiPath = `/users/${encodeURIComponent(userId)}`;
    const validated = patchUserSchema.parse(body);
    return handleResponse<Record<string, unknown>>(
      await patchRequest(apiPath, validated),
      apiPath
    );
  };

  // https://auth0.com/docs/api/management/v2/users/post-users
  const createUser = async (body: CreateUserBody): Promise<Record<string, unknown>> => {
    const apiPath = `/users`;
    let validated: CreateUserBody;
    if (userSchema) {
      // Validate user profile fields against tenant schema, then require connection separately
      const { connection, ...profileFields } = body as Record<string, unknown>;
      const validatedProfile = userSchema.parse(profileFields) as Record<string, unknown>;
      validated = CreateUserSchema.parse({ ...validatedProfile, connection });
    } else {
      validated = CreateUserSchema.parse(body);
    }
    return handleResponse<Record<string, unknown>>(
      await postRequest(apiPath, validated),
      apiPath
    );
  };

  // https://auth0.com/docs/api/management/v2/tickets/post-password-change
  const createPasswordTicket = async (
    body: Record<string, unknown>
  ): Promise<unknown> => {
    const apiPath = `/tickets/password-change`;
    return handleResponse<unknown>(await postRequest(apiPath, body), apiPath);
  };

  // https://auth0.com/docs/api/management/v2/tickets/post-email-verification
  const createEmailVerificationTicket = async (
    userId: string,
    clientId: string
  ): Promise<unknown> => {
    const apiPath = `/tickets/email-verification`;
    return handleResponse<unknown>(
      await postRequest(apiPath, { user_id: userId, client_id: clientId }),
      apiPath
    );
  };

  // https://auth0.com/docs/api/management/v2/guardian/post-ticket
  const createMfaEnrollmentTicket = async (
    userId: string,
    factor?: string
  ): Promise<unknown> => {
    const apiPath = `/guardian/enrollments/ticket`;
    const body: Record<string, unknown> = {
      user_id: userId,
      send_mail: false,
      allow_multiple_enrollments: true,
    };
    if (factor) body.factor = factor;
    return handleResponse<unknown>(await postRequest(apiPath, body), apiPath);
  };

  // https://auth0.com/docs/api/management/v2/users/get-authentication-methods
  const getMfaFactors = async (userId: string): Promise<unknown> => {
    const apiPath = `/users/${encodeURIComponent(userId)}/authentication-methods`;
    return handleResponse<unknown>(await getRequest(apiPath), apiPath);
  };

  // https://auth0.com/docs/api/management/v2/users/post-authentication-methods
  const addMfaFactor = async (
    userId: string,
    type: string,
    value: string
  ): Promise<unknown> => {
    const apiPath = `/users/${encodeURIComponent(userId)}/authentication-methods`;
    const body = { type, [type === "phone" ? "phone_number" : type]: value };
    return handleResponse<unknown>(await postRequest(apiPath, body), apiPath);
  };

  // https://auth0.com/docs/api/management/v2/users/delete-authentication-methods-by-authentication-method-id
  const deleteMfaFactor = async (userId: string, methodId: string): Promise<void> => {
    const apiPath = `/users/${encodeURIComponent(userId)}/authentication-methods/${encodeURIComponent(methodId)}`;
    await handleResponse<unknown>(await deleteRequest(apiPath), apiPath);
  };

  // https://auth0.com/docs/api/management/v2/users/post-identities
  const linkUser = async (
    primaryUserId: string,
    body:
      | { provider: string; user_id: string; connection_id?: string }
      | { link_with: string }
  ): Promise<unknown> => {
    const apiPath = `/users/${encodeURIComponent(primaryUserId)}/identities`;
    return handleResponse<unknown>(await postRequest(apiPath, body), apiPath);
  };

  return {
    getUser,
    getUsers,
    patchUser,
    createUser,
    createPasswordTicket,
    createEmailVerificationTicket,
    createMfaEnrollmentTicket,
    getMfaFactors,
    addMfaFactor,
    deleteMfaFactor,
    linkUser,
  };
}
