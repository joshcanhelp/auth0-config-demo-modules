import type { Response, Request } from "express";

import { detectLoginMethod } from "../detectLoginMethod.js";
import { pageLayout } from "./pageLayout.js";
import { clientHasScope, getClientGrants, readGrants } from "../readGrants.js";
import type { ClientGrant } from "../readGrants.js";
import type {
  Auth0Client,
  Auth0ClientType,
  Connection,
  LoginMethod,
  TenantConfig,
} from "../../types.js";
import type { SchemaField, PrimitiveField } from "../../utils/tenantUserSchema.js";
import { readTenantConfig } from "../readTenantConfig.js";
import { readConnections } from "../readConnections.js";
import { SessionData } from "express-session";

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

function renderPrimitiveField(field: PrimitiveField): string {
  const description = field.description
    ? `\n      <small>${field.description}</small>`
    : "";
  if (field.kind === "boolean") {
    return `<div class="field-wrapper">
      <label><input type="checkbox" name="${field.formName}" value="true"> ${field.label}</label>${description}
    </div>`;
  }
  const inputType =
    field.kind === "email" ? "email" : field.kind === "password" ? "password" : "text";
  const required = field.required ? " required" : "";
  const value = field.required ? ` value="${mockValue(field)}"` : "";
  return `<div class="field-wrapper">
      <label for="${field.formName}">${field.label}${field.required ? " *" : ""}</label>
      <input type="${inputType}" id="${field.formName}" name="${field.formName}"${required}${value}>${description}
    </div>`;
}

function renderField(field: SchemaField): string {
  if (field.kind === "group") {
    const subFields = field.fields.map(renderPrimitiveField).join("\n      ");
    const description = field.description
      ? `\n      <small>${field.description}</small>`
      : "";
    return `<fieldset>
      <legend>${field.label}</legend>${description}
      ${subFields}
    </fieldset>`;
  }
  return renderPrimitiveField(field);
}

function renderCopyableValue(value: string, isDefault = false): string {
  const defaultLabel = isDefault ? ` <small>(default)</small>` : "";
  return `<div style="display:flex;align-items:center;gap:0.5rem;">
    <code>${value}</code>
    <button type="button" class="outline secondary" style="margin:0;padding:0.15rem 0.5rem;font-size:0.85em;" aria-label="Copy ${value}" onclick="navigator.clipboard.writeText('${value}').then(() => { const b = this; const t = b.textContent; b.textContent = 'Copied!'; setTimeout(() => { b.textContent = t; }, 1500); })">Copy</button>${defaultLabel}
  </div>`;
}

function renderClientIdRow(client: Auth0Client): string {
  return `<dt>Client ID</dt><dd>${renderCopyableValue(client.client_id)}</dd>`;
}

const APP_TYPE_DESCRIPTIONS: Record<Auth0ClientType, string> = {
  regular_web: "A traditional web app that runs on a server (e.g. Express, Rails, Django).",
  spa: "A single-page application that runs entirely in the browser (e.g. React, Vue, Angular).",
  native: "A native mobile or desktop application.",
  non_interactive:
    "A machine-to-machine application that authenticates without user interaction, using the client credentials grant.",
};

function renderAppTypeRow(client: Auth0Client): string {
  return `<dt>Type</dt><dd><span tabindex="0" style="cursor:help;border-bottom:1px dotted;" data-tooltip="${APP_TYPE_DESCRIPTIONS[client.app_type]}">${client.app_type}</span></dd>`;
}

function getLoginDomains(client: Auth0Client, tenantConfig: TenantConfig): string[] {
  const metadataValue = client.client_metadata?.login_domain as string | undefined;
  if (metadataValue) {
    return metadataValue
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
  }
  return tenantConfig.customDomains;
}

function getDefaultLoginDomain(
  client: Auth0Client,
  tenantConfig: TenantConfig,
  domains: string[]
): string {
  if (client.client_metadata?.login_domain) {
    return domains[0] ?? tenantConfig.tenantDomain;
  }
  return tenantConfig.defaultCustomDomain ?? tenantConfig.tenantDomain;
}

function renderLoginDomainsRow(domains: string[], defaultDomain: string): string {
  if (domains.length === 0) {
    return `<dt>Login Domain(s)</dt><dd>(none)</dd>`;
  }
  const rows = domains
    .map((d) => renderCopyableValue(d, d === defaultDomain))
    .join("\n    ");
  return `<dt>Login Domain(s)</dt><dd style="display:flex;flex-direction:column;gap:0.35rem;">${rows}</dd>`;
}

function renderLoginDomainSelect(
  domains: string[],
  tenantDomain: string,
  defaultDomain: string
): string {
  const allDomains = Array.from(new Set([...domains, tenantDomain]));
  const options = allDomains
    .map((d) => {
      const selected = d === defaultDomain ? " selected" : "";
      const label = d === tenantDomain ? " (testing)" : "";
      return `<option value="${d}"${selected}>${d}${label}</option>`;
    })
    .join("\n        ");

  return `<div>
        <label for="login_domain">Login Domain</label>
        <select id="login_domain" name="login_domain">
          ${options}
        </select>
      </div>`;
}

function renderGrantsSection(grants: ClientGrant[]): string {
  if (grants.length === 0) {
    return `<p>No grants found locally. Run <code>npm run export</code> to pull grants from the tenant.</p>`;
  }
  const items = grants
    .map((g) => {
      const scopes = g.scope.length > 0 ? g.scope.join(", ") : "(no scopes)";
      return `<li><strong>${g.audience}</strong>: ${scopes}</li>`;
    })
    .join("\n      ");
  return `<ul>
      ${items}
    </ul>`;
}

function renderM2MClientPage(
  client: Auth0Client,
  tenantConfig: TenantConfig,
  connections: Connection[],
  userSchemaFields: SchemaField[],
  grants: ClientGrant[]
): string {
  const dbConnections = getDatabaseConnections(connections);

  let createUserSection: string;
  if (!userSchemaFields || userSchemaFields.length === 0) {
    createUserSection = `<p>No user schema defined for this tenant. Add a <code>user-schema.ts</code> to enable user creation.</p>`;
  } else if (dbConnections.length === 0) {
    createUserSection = `<p>No database connections are assigned to this client. Assign at least one database connection to enable user creation.</p>`;
  } else {
    const connectionOptions = dbConnections
      .map((c) => `<option value="${c.name}">${c.name}</option>`)
      .join("\n            ");

    createUserSection = clientHasScope(grants, client.client_id, "create:users")
      ? `<h2>Create User</h2>
      <button type="button" onclick="document.getElementById('create-user-dialog').showModal()">
          Create User
        </button>

        <dialog id="create-user-dialog">
          <article>
            <header><h2>Create User</h2></header>
            <form id="create-user-form" method="post" action="/create-user/${client.client_id}">
              <div>
                <label for="connection">Connection</label>
                <select id="connection" name="connection" required>
                  ${connectionOptions}
                </select>
              </div>
              ${userSchemaFields.map(renderField).join("\n              ")}
            </form>
            <footer>
              <button type="button" class="outline secondary" onclick="document.getElementById('create-user-dialog').close()">Cancel</button>
              <button type="submit" form="create-user-form">Create</button>
            </footer>
          </article>
        </dialog>`
      : "";
  }

  const searchSection = clientHasScope(grants, client.client_id, "read:users")
    ? `<h2>User Search</h2>
  <form method="post" action="/search-users/${client.client_id}">
    <label for="query">Search query</label>
    <div style="display:flex;gap:0.5rem;">
      <input type="text" id="query" name="query" placeholder="email:user@example.com">
      <button type="submit">Search</button>
    </div>
  </form>`
    : "";

  return pageLayout({
    title: `${client.name} — ${tenantConfig.friendlyName}`,
    tenantConfig,

    body: `
  <p><a href="/">&larr; Back</a></p>
  <h1>${client.name}</h1>
  <dl>
    ${renderClientIdRow(client)}
    ${renderAppTypeRow(client)}
    <dt>Grants</dt><dd>${client.grant_types.join(", ")}</dd>
  </dl>
  <h2>Client Grants</h2>
  ${renderGrantsSection(grants)}
  ${searchSection}
  ${createUserSection}`,
  });
}

function renderSelfServiceSection(
  client: Auth0Client,
  connections: Connection[],
  session?: SessionData
): string {
  const dbConnections = getDatabaseConnections(connections);
  const header = "<h2>Self-Service</h2>";
  const noUserError = "No user in context. Login to see self-service options.";

  if (dbConnections.length === 0) {
    return `${header}<p>No database connection is configured for this client. Self-service features require a database connection.</p>`;
  }

  if (client.app_type === "regular_web" && !session?.auth0UserId) {
    return `${header}<p>${noUserError}</p>`;
  }

  return `${header}
  <div id="client-self-service-actions">
    <p>
      <a href="/change-password-email/${client.client_id}"><button>Change Password (email)</button></a>
      ${client.client_metadata?.bff_client_id ? `<a href="/change-password-link/${client.client_id}"><button>Change Password (link)</button></a>` : ""}
    </p>
  </div>
  <script>if (!localStorage.getItem("auth0_user_id")) document.getElementById("client-self-service-actions").innerHTML = "<p>${noUserError}</p>"</script>`;
}

function renderLoginClientPage(
  client: Auth0Client,
  tenantConfig: TenantConfig,
  connections: Connection[],
  grants: ClientGrant[],
  loginMethod: LoginMethod,
  session?: SessionData
): string {
  const method = loginMethod;

  const connectionOptions = connections
    .map((c) => `<option value="${c.name}">${c.name} (${c.strategy})</option>`)
    .join("\n        ");

  const connectionSelect =
    connections.length > 0
      ? `<div>
        <label for="connection">Connection</label>
        <select id="connection" name="connection">
          <option value="">-- Default --</option>
          ${connectionOptions}
        </select>
      </div>`
      : `<p>No connections found for this client.</p>`;

  const grantsSection = client.grant_types.includes("client_credentials")
    ? `<h2>Client Grants</h2>\n  ${renderGrantsSection(grants)}`
    : "";

  const { tenantDomain } = tenantConfig;
  const loginDomains = getLoginDomains(client, tenantConfig);
  const defaultLoginDomain = getDefaultLoginDomain(client, tenantConfig, loginDomains);
  const loginDomainSelect = renderLoginDomainSelect(
    loginDomains,
    tenantDomain,
    defaultLoginDomain
  );

  const loginMethodDescriptions: Record<LoginMethod, string> = {
    frontend:
      "The authorization code exchange happens in the browser - no client secret is used.",
    backend: "The authorization code exchange happens server-side using a client secret.",
  };

  return pageLayout({
    title: `${client.name} — ${tenantConfig.friendlyName}`,
    tenantConfig,

    body: `
  <p><a href="/">&larr; Back</a></p>
  <h1>${client.name}</h1>
  <dl>
    ${renderClientIdRow(client)}
    ${renderAppTypeRow(client)}
    <dt>Grants</dt><dd>${client.grant_types.join(", ")}</dd>
    <dt>Login method</dt><dd><span tabindex="0" style="cursor:help;border-bottom:1px dotted;" data-tooltip="${loginMethodDescriptions[method]}">${method}</span></dd>
    ${renderLoginDomainsRow(loginDomains, defaultLoginDomain)}
  </dl>
  ${grantsSection}
  <form method="get" action="/login/${client.client_id}">
    ${connectionSelect}
    ${loginDomainSelect}
    <div>
      <label for="extra_params">Extra parameters</label>
      <textarea id="extra_params" name="extra_params" placeholder="screen_hint=signup&#10;prompt=login"></textarea>
    </div>
    <button type="submit">Login</button>
  </form>
  ${renderSelfServiceSection(client, connections, session)}`,
  });
}

export function renderClientPage({
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
    return response.send(
      renderM2MClientPage(
        response.locals.client!,
        tenantConfig,
        connections,
        response.locals.userSchemaFields,
        grants
      )
    );
  }

  const loginMethod = detectLoginMethod(response.locals.client!, env);
  return response.send(
    renderLoginClientPage(
      response.locals.client!,
      tenantConfig,
      connections,
      response.locals.grants,
      loginMethod,
      request.session
    )
  );
}
