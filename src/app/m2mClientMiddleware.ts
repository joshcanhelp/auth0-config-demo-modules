import type { RequestHandler } from "express";
import type { z } from "zod";

import {
  getClientCredentialsToken,
  type TokenCache,
} from "../auth0/clientCredentials.js";
import { createManagementApi } from "../auth0/apiManagement.js";
import type { Auth0Client } from "../types.js";
import { readGrants, clientHasScope } from "./readGrants.js";
import { readTenantConfig } from "./readTenantConfig.js";

declare module "express-serve-static-core" {
  interface Locals {
    managementApi?: ReturnType<typeof createManagementApi>;
    managementTokenCache?: TokenCache;
  }
}

export function createM2mClientMiddleware(
  TENANT_DIR: string,
  tenantUserSchema: z.ZodType | null,
  getManagementTokenCache: (clientId: string) => TokenCache,
  requiredScope: string
): RequestHandler {
  return async (req, res, next) => {
    const client = res.locals.client as Auth0Client;
    const tenantConfig = readTenantConfig(TENANT_DIR, process.env);

    const grants = readGrants(TENANT_DIR);
    if (!clientHasScope(grants, client.client_id, requiredScope)) {
      res.status(403).send(`This client does not have the ${requiredScope} grant.`);
      return;
    }

    const secretKey = `CLIENT_ID_${client.client_id}_SECRET`;
    const clientSecret = process.env[secretKey];
    if (!clientSecret) {
      res.status(500).send(`Missing env var ${secretKey}`);
      return;
    }

    const cache = getManagementTokenCache(client.client_id);

    try {
      const token = await getClientCredentialsToken(
        tenantConfig.tenantDomain,
        client.client_id,
        clientSecret,
        { cache }
      );
      res.locals.managementApi = createManagementApi(tenantConfig.tenantDomain, token, {
        userSchema: tenantUserSchema ?? undefined,
      });
      res.locals.managementTokenCache = cache;
      next();
    } catch (err) {
      next(err);
    }
  };
}
