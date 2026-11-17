import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Response, Request } from "express";

import { detectLoginMethod } from "../../detectLoginMethod.js";
import { liquid } from "../../liquidEngine.js";
import { pageLayout } from "../../pageLayout.js";
import { clientHasScope, getClientGrants, readGrants } from "../../readGrants.js";
import type { ClientGrant } from "../../readGrants.js";
import type {
  Auth0Client,
  Auth0ClientType,
  Connection,
  LoginMethod,
  TenantConfig,
} from "../../types.js";
import type {
  SchemaField,
  PrimitiveField,
} from "auth0-config-demo-modules/packages/core/src/index.js";
import { readTenantConfig } from "../../readTenantConfig.js";
import { readConnections } from "../../readConnections.js";
import { getLoginDomains, getDefaultLoginDomain } from "../../loginDomain.js";
import { SessionData } from "express-session";

const dir = dirname(fileURLToPath(import.meta.url));

function getDatabaseConnections(connections: Connection[]): Connection[] {
  return connections.filter((c) => c.strategy === "auth0");
}

function mockValue(field: PrimitiveField): string {
  if (field.kind === "email") return `test+${Date.now()}@example.com`;
  if (field.kind === "password") return "Password123!";
  if (field.name === "given_name") return "Test";
  if (field.name === "family_name") return "User";
  if (field.name === "name") return "Test User";
  return `test_${field.name}`;
}

function buildPrimitiveFieldViewModel(field: PrimitiveField) {
  return {
    formName: field.formName,
    label: field.label,
    description: field.description ?? null,
    isBoolean: field.kind === "boolean",
    inputType:
      field.kind === "email" ? "email" : field.kind === "password" ? "password" : "text",
    required: Boolean(field.required),
    mockValue: field.required ? mockValue(field) : null,
  };
}

function buildUserSchemaFieldsViewModel(fields: SchemaField[]) {
  return fields.map((field) => {
    if (field.kind === "group") {
      return {
        isGroup: true,
        label: field.label,
        description: field.description ?? null,
        fields: field.fields.map(buildPrimitiveFieldViewModel),
      };
    }
    return { isGroup: false, ...buildPrimitiveFieldViewModel(field) };
  });
}

function buildGrantsViewModel(grants: ClientGrant[]) {
  return grants.map((g) => ({
    audience: g.audience,
    scopeDisplay: g.scope.length > 0 ? g.scope.join(", ") : "(no scopes)",
  }));
}

const APP_TYPE_DESCRIPTIONS: Record<Auth0ClientType, string> = {
  regular_web:
    "A traditional web app that runs on a server (e.g. Express, Rails, Django).",
  spa: "A single-page application that runs entirely in the browser (e.g. React, Vue, Angular).",
  native: "A native mobile or desktop application.",
  non_interactive:
    "A machine-to-machine application that authenticates without user interaction, using the client credentials grant.",
};

function buildAppTypeViewModel(client: Auth0Client) {
  return { value: client.app_type, description: APP_TYPE_DESCRIPTIONS[client.app_type] };
}

function buildLoginDomainsViewModel(domains: string[], defaultDomain: string) {
  return domains.map((value) => ({ value, isDefault: value === defaultDomain }));
}

function buildLoginDomainOptionsViewModel(
  domains: string[],
  tenantDomain: string,
  defaultDomain: string
) {
  const allDomains = Array.from(new Set([...domains, tenantDomain]));
  return allDomains.map((value) => ({
    value,
    selected: value === defaultDomain,
    isTenantDomain: value === tenantDomain,
  }));
}

function buildConnectionOptionsViewModel(connections: Connection[]) {
  return connections.map((c) => ({ name: c.name, strategy: c.strategy }));
}

async function renderM2MClientPage(
  client: Auth0Client,
  tenantConfig: TenantConfig,
  connections: Connection[],
  userSchemaFields: SchemaField[],
  grants: ClientGrant[]
): Promise<string> {
  const dbConnections = getDatabaseConnections(connections);
  const hasUserSchema = Boolean(userSchemaFields && userSchemaFields.length > 0);
  const hasDbConnections = dbConnections.length > 0;

  let createUserState: "no-schema" | "no-db-connections" | "no-scope" | "ready";
  if (!hasUserSchema) createUserState = "no-schema";
  else if (!hasDbConnections) createUserState = "no-db-connections";
  else if (!clientHasScope(grants, client.client_id, "create:users"))
    createUserState = "no-scope";
  else createUserState = "ready";

  const body = await liquid.renderFile(join(dir, "render-m2m.liquid"), {
    backHref: "/",
    clientName: client.name,
    clientId: client.client_id,
    appType: buildAppTypeViewModel(client),
    grantTypesDisplay: client.grant_types.join(", "),
    grants: buildGrantsViewModel(grants),
    hasGrants: grants.length > 0,
    canSearchUsers: clientHasScope(grants, client.client_id, "read:users"),
    searchUsersAction: `/search-users/${client.client_id}`,
    createUserState,
    createUserAction: `/create-user/${client.client_id}`,
    dbConnectionOptions: buildConnectionOptionsViewModel(dbConnections),
    userSchemaFields:
      createUserState === "ready" ? buildUserSchemaFieldsViewModel(userSchemaFields) : [],
  });

  return pageLayout({
    title: `${client.name} - ${tenantConfig.friendlyName}`,
    tenantConfig,
    body,
  });
}

export interface SelfServiceRow {
  label: string;
  href: string;
  available: boolean;
  reason: string;
}

export function getSelfServiceRows(
  client: Auth0Client,
  dbConnections: Connection[],
  loginMethod: LoginMethod
): SelfServiceRow[] {
  const hasDbConnection = dbConnections.length > 0;
  const hasClientCredentialsGrant = client.grant_types.includes("client_credentials");
  const hasBffClientId = Boolean(client.client_metadata?.bff_client_id);
  const noDbConnectionReason = "Requires a database connection.";

  const changePasswordLinkAvailable =
    loginMethod === "backend" ? hasClientCredentialsGrant : hasBffClientId;
  const changePasswordLinkReason = !hasDbConnection
    ? noDbConnectionReason
    : loginMethod === "backend"
      ? "Requires the client_credentials grant."
      : "Requires a bff_client_id in client metadata.";

  return [
    {
      label: "Change Password (email)",
      href: `/change-password-email/${client.client_id}`,
      available: hasDbConnection,
      reason: noDbConnectionReason,
    },
    {
      label: "Change Password (link)",
      href: `/change-password-link/${client.client_id}`,
      available: hasDbConnection && changePasswordLinkAvailable,
      reason: changePasswordLinkReason,
    },
    {
      label: "Verify Email",
      href: `/verify-email/${client.client_id}`,
      available: loginMethod === "backend" && hasClientCredentialsGrant,
      reason:
        loginMethod === "backend"
          ? "Requires the client_credentials grant."
          : "Requires a backend login - this client authenticates in the browser.",
    },
  ];
}

const NO_USER_ERROR = "No user in context. Login to see self-service options.";

function buildSelfServiceViewModel(
  client: Auth0Client,
  connections: Connection[],
  loginMethod: LoginMethod,
  session?: SessionData
) {
  if (client.app_type === "regular_web" && !session?.auth0UserId) {
    return { showNoUserMessage: true, noUserError: NO_USER_ERROR, rows: [] };
  }

  const dbConnections = getDatabaseConnections(connections);
  return {
    showNoUserMessage: false,
    noUserError: NO_USER_ERROR,
    rows: getSelfServiceRows(client, dbConnections, loginMethod),
  };
}

const LOGIN_METHOD_DESCRIPTIONS: Record<LoginMethod, string> = {
  frontend:
    "The authorization code exchange happens in the browser - no client secret is used.",
  backend: "The authorization code exchange happens server-side using a client secret.",
};

async function renderLoginClientPage(
  client: Auth0Client,
  tenantConfig: TenantConfig,
  connections: Connection[],
  grants: ClientGrant[],
  loginMethod: LoginMethod,
  session?: SessionData
): Promise<string> {
  const { tenantDomain } = tenantConfig;
  const loginDomains = getLoginDomains(client, tenantConfig);
  const defaultLoginDomain = getDefaultLoginDomain(client, tenantConfig, loginDomains);
  const showGrantsSection = client.grant_types.includes("client_credentials");

  const body = await liquid.renderFile(join(dir, "render-login.liquid"), {
    backHref: "/",
    clientName: client.name,
    clientId: client.client_id,
    appType: buildAppTypeViewModel(client),
    grantTypesDisplay: client.grant_types.join(", "),
    loginMethod,
    loginMethodDescription: LOGIN_METHOD_DESCRIPTIONS[loginMethod],
    hasLoginDomains: loginDomains.length > 0,
    loginDomains: buildLoginDomainsViewModel(loginDomains, defaultLoginDomain),
    showGrantsSection,
    grants: showGrantsSection ? buildGrantsViewModel(grants) : [],
    hasGrants: showGrantsSection && grants.length > 0,
    loginAction: `/login/${client.client_id}`,
    hasConnections: connections.length > 0,
    connections: buildConnectionOptionsViewModel(connections),
    loginDomainOptions: buildLoginDomainOptionsViewModel(
      loginDomains,
      tenantDomain,
      defaultLoginDomain
    ),
    selfService: buildSelfServiceViewModel(client, connections, loginMethod, session),
  });

  return pageLayout({
    title: `${client.name} - ${tenantConfig.friendlyName}`,
    tenantConfig,
    body,
  });
}

export async function renderClientPage({
  request,
  response,
  env,
}: {
  request: Request;
  response: Response;
  env: NodeJS.ProcessEnv;
}) {
  const tenantConfig = readTenantConfig(response.locals.tenantDataDir, env);
  const connections = readConnections(response.locals.tenantDataDir);

  if (response.locals.client!.app_type === "non_interactive") {
    const allGrants = readGrants(response.locals.tenantDataDir);
    const grants = getClientGrants(allGrants, response.locals.client!.client_id);
    const body = await renderM2MClientPage(
      response.locals.client!,
      tenantConfig,
      connections,
      response.locals.userSchemaFields,
      grants
    );
    return response.send(body);
  }

  const loginMethod = detectLoginMethod(response.locals.client!, env);
  const body = await renderLoginClientPage(
    response.locals.client!,
    tenantConfig,
    connections,
    response.locals.grants,
    loginMethod,
    request.session
  );
  return response.send(body);
}
