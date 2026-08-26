import crypto from "node:crypto";
import path from "node:path";
import { existsSync } from "node:fs";

import express from "express";
import type { NextFunction, Request, Response } from "express";
import session from "express-session";

import type { TokenCache } from "../auth0/clientCredentials.js";
import { createMemoryCache } from "../utils/memoryCache.js";
import { loadTenantUserSchema, getUserSchemaFields } from "../utils/tenantUserSchema.js";
import { createClientMiddleware } from "./clientMiddleware.js";
import { createM2mClientMiddleware } from "./m2mClientMiddleware.js";
import { readClients } from "./readClients.js";
import { resolveBaseUrl, updateAllClientUrls } from "./updateClientUrls.js";
import { validateClient } from "./validateClient.js";
import { Auth0Client } from "../types.js";
import { createAuthenticationApi } from "../auth0/apiAuthentication.js";
import { readTenantConfig } from "./readTenantConfig.js";

declare module "express-serve-static-core" {
  interface Locals {
    auth0Domain: string;
    loginDomain: string;
    baseUrl: string;
    tenantDataDir: string;
    client?: Auth0Client;
    authenticationApi?: ReturnType<typeof createAuthenticationApi>;
  }
}

declare module "express-session" {
  interface SessionData {
    pkceVerifier?: string;
    oauthState?: string;
  }
}

export async function createApp(tenantDir: string) {
  const projectRoot = process.cwd();
  const TENANT_DIR = path.join(projectRoot, tenantDir);
  const tenantConfig = readTenantConfig(TENANT_DIR, process.env);
  const baseUrl = resolveBaseUrl(process.env);

  const deployedUrl = process.env.DEPLOYED_APP_URL?.replace(/\/$/, "");
  const localUrlsChanged = updateAllClientUrls(TENANT_DIR, baseUrl);
  const deployedUrlsChanged = deployedUrl
    ? updateAllClientUrls(TENANT_DIR, deployedUrl)
    : false;

  if (localUrlsChanged || deployedUrlsChanged) {
    console.warn(
      `Warning: tenant config was updated with URLs for ${baseUrl}. Deploy the config before starting the app.`
    );
  }

  for (const client of readClients(TENANT_DIR)) {
    const errors = validateClient(client, process.env);
    if (errors.length > 0) {
      console.warn(`Warning: invalid client "${client.name}" (${client.client_id}):`);
      errors.forEach((e) => console.warn(`  - ${e}`));
    }
  }

  const tenantUserSchema = await loadTenantUserSchema(TENANT_DIR);
  const tenantUserSchemaFields = tenantUserSchema
    ? getUserSchemaFields(tenantUserSchema)
    : [];

  const managementTokenCaches = new Map<string, TokenCache>();
  const getManagementTokenCache = (clientId: string): TokenCache => {
    if (!managementTokenCaches.has(clientId)) {
      managementTokenCaches.set(clientId, createMemoryCache());
    }
    return managementTokenCaches.get(clientId)!;
  };

  const sessionSecret =
    process.env.SESSION_SECRET ?? crypto.randomBytes(32).toString("hex");

  const app = express();
  const staticDir = path.join(TENANT_DIR, "_static");
  if (existsSync(staticDir)) {
    app.use(express.static(staticDir));
  }

  app.use(express.urlencoded({ extended: true }));

  const sessionOpts = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: baseUrl.startsWith("https://") },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionOpts));

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.locals.auth0Domain = tenantConfig.tenantDomain;
    res.locals.loginDomain = tenantConfig.loginDomain;
    res.locals.baseUrl = baseUrl;
    res.locals.tenantDataDir = TENANT_DIR;
    next();
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).send(err.message);
  });

  const anyClientMiddleware = createClientMiddleware(() => readClients(TENANT_DIR));

  const loginableClientMiddleware = createClientMiddleware(
    () => readClients(TENANT_DIR),
    {
      loginableOnly: true,
    }
  );

  const createUsersClientMiddleware = createM2mClientMiddleware(
    TENANT_DIR,
    tenantUserSchema,
    getManagementTokenCache,
    "create:users"
  );

  const readUsersClientMiddleware = createM2mClientMiddleware(
    TENANT_DIR,
    null,
    getManagementTokenCache,
    "read:users"
  );

  return {
    app,
    TENANT_DIR,
    baseUrl,
    tenantUserSchema,
    tenantUserSchemaFields,
    anyClientMiddleware,
    loginableClientMiddleware,
    createUsersClientMiddleware,
    readUsersClientMiddleware,
  };
}
