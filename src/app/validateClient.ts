import type { Auth0Client } from "../types.js";

const VALID_APP_TYPES = new Set(["native", "spa", "regular_web", "non_interactive"]);

const REQUIRED_FIELDS: (keyof Auth0Client)[] = [
  "client_id",
  "name",
  "app_type",
  "grant_types",
  "token_endpoint_auth_method",
];

const REQUIRED_INTERACTIVE_FIELDS: (keyof Auth0Client)[] = [
  "callbacks",
  "allowed_logout_urls",
];

const REQUIRED_SPA_FIELDS: (keyof Auth0Client)[] = ["allowed_origins"];

export function validateClient(
  client: Auth0Client,
  env: NodeJS.ProcessEnv = {}
): string[] {
  if (client.client_metadata?.hide_from_demo === "true") {
    return [];
  }

  const errors: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (client[field] === undefined || client[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (client.app_type && !VALID_APP_TYPES.has(client.app_type)) {
    errors.push(
      `Invalid app_type "${client.app_type}". Must be one of: ${[...VALID_APP_TYPES].join(", ")}`
    );
  }

  const isNonInteractive = client.app_type === "non_interactive";

  if (!isNonInteractive) {
    for (const field of REQUIRED_INTERACTIVE_FIELDS) {
      if (client[field] === undefined || client[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  if (client.app_type === "spa") {
    for (const field of REQUIRED_SPA_FIELDS) {
      if (client[field] === undefined || client[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  const isClientCredentialsOnly =
    client.grant_types?.length === 1 && client.grant_types[0] === "client_credentials";

  if (isNonInteractive && !isClientCredentialsOnly) {
    errors.push(`non_interactive app_type must have grant_types: ["client_credentials"]`);
  }

  if (isNonInteractive) {
    if (client.callbacks?.length > 0) {
      errors.push("non_interactive app_type must not have callbacks");
    }
    if (client.allowed_logout_urls?.length > 0) {
      errors.push("non_interactive app_type must not have allowed_logout_urls");
    }
    if (client.allowed_origins?.length > 0) {
      errors.push("non_interactive app_type must not have allowed_origins");
    }

    if (client.client_id) {
      const secretKey = `CLIENT_ID_${client.client_id}_SECRET`;
      if (!env[secretKey]) {
        errors.push(`non_interactive app_type requires env var ${secretKey}`);
      }
    }
  }

  const ALLOWED_SPA_GRANTS = new Set(["authorization_code", "refresh_token"]);
  if (
    client.app_type === "spa" &&
    client.grant_types?.some((g) => !ALLOWED_SPA_GRANTS.has(g))
  ) {
    errors.push(
      `spa app_type only allows grant_types: ["authorization_code", "refresh_token"]`
    );
  }

  if (client.app_type === "regular_web") {
    if (client.allowed_origins?.length > 0) {
      errors.push("regular_web app_type must not have allowed_origins");
    }

    if (client.token_endpoint_auth_method !== "client_secret_post") {
      errors.push(
        `regular_web app_type must have token_endpoint_auth_method: "client_secret_post"`
      );
    }

    if (client.client_id) {
      const secretKey = `CLIENT_ID_${client.client_id}_SECRET`;
      if (!env[secretKey]) {
        errors.push(`regular_web app_type requires env var ${secretKey}`);
      }
    }
  }

  return errors;
}
