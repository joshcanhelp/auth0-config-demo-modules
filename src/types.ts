import type { Client } from "auth0-deploy-cli/lib/tools/auth0/handlers/clients.js";
import type { Connection as DeployConnection } from "auth0-deploy-cli/lib/tools/auth0/handlers/connections.js";

export type Auth0ClientType = "regular_web" | "spa" | "native" | "non_interactive";

// Required fields from the Deploy CLI's Client type.
// app_type and token_endpoint_auth_method are widened to string because values
// are read from JSON files, not from a typed API response.
export type Auth0Client = Omit<
  Required<
    Pick<
      Client,
      | "client_id"
      | "name"
      | "app_type"
      | "grant_types"
      | "token_endpoint_auth_method"
      | "callbacks"
      | "allowed_logout_urls"
      | "allowed_origins"
    >
  >,
  "app_type" | "token_endpoint_auth_method"
> &
  Pick<Client, "logo_uri" | "client_metadata"> & {
    app_type: Auth0ClientType;
    token_endpoint_auth_method: string;
  };

export type Connection = DeployConnection;

export interface TenantConfig {
  tenantDomain: string;
  loginDomain: string;
  customDomains: string[];
  friendlyName: string;
}

export type LoginMethod = "backend" | "frontend";

export type { CreateUserBody as TenantUserBody } from "./auth0/userProfile.js";
