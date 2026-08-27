import type { Response } from "express";
import { detectLoginMethod } from "./detectLoginMethod.js";
import { pageLayout } from "./pageLayout.js";
import { clientHasScope, readGrants } from "./readGrants.js";
import type { ClientGrant } from "./readGrants.js";
import type { Auth0Client, Connection, LoginMethod, TenantConfig } from "../types.js";
import type { SchemaField, PrimitiveField } from "../utils/tenantUserSchema.js";
import { readTenantConfig } from "./readTenantConfig.js";
import { readConnections } from "./readConnections.js";

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
  const label = field.name.replace(/_/g, " ");
  if (field.kind === "boolean") {
    return `<div>
      <label><input type="checkbox" name="${field.formName}" value="true"> ${label}</label>
    </div>`;
  }
  const inputType =
    field.kind === "email" ? "email" : field.kind === "password" ? "password" : "text";
  const required = field.required ? " required" : "";
  const value = field.required ? ` value="${mockValue(field)}"` : "";
  return `<div>
      <label for="${field.formName}">${label}${field.required ? " *" : ""}</label>
      <input type="${inputType}" id="${field.formName}" name="${field.formName}"${required}${value}>
    </div>`;
}

function renderField(field: SchemaField): string {
  if (field.kind === "group") {
    const subFields = field.fields.map(renderPrimitiveField).join("\n      ");
    return `<fieldset>
      <legend>${field.name.replace(/_/g, " ")}</legend>
      ${subFields}
    </fieldset>`;
  }
  return renderPrimitiveField(field);
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

function renderM2MPage(
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

    createUserSection = `<button type="button" onclick="document.getElementById('create-user-dialog').showModal()">
          Create User
        </button>

        <dialog id="create-user-dialog">
          <h2>Create User</h2>
          <form method="post" action="/create-user/${client.client_id}">
            <div>
              <label for="connection">Connection</label>
              <select id="connection" name="connection" required>
                ${connectionOptions}
              </select>
            </div>
            ${userSchemaFields.map(renderField).join("\n            ")}
            <div style="display:flex;gap:1rem;margin-top:1rem;">
              <button type="submit">Create</button>
              <button type="button" onclick="document.getElementById('create-user-dialog').close()">Cancel</button>
            </div>
          </form>
        </dialog>`;
  }

  const searchSection = clientHasScope(grants, client.client_id, "read:users")
    ? `<h2>User Search</h2>
  <form method="post" action="/search-users/${client.client_id}">
    <div>
      <label for="query">Search query</label>
      <input type="text" id="query" name="query" placeholder="email:user@example.com">
    </div>
    <button type="submit">Search</button>
  </form>`
    : "";

  return pageLayout({
    title: `${client.name} — ${tenantConfig.friendlyName}`,
    tenantConfig,
    maxWidth: "700px",
    styles: `
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; margin: 1rem 0; }
    dt { font-weight: bold; color: #555; }
    form { display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem; }
    fieldset { border: 1px solid #ddd; border-radius: 4px; padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    legend { font-weight: bold; padding: 0 0.25rem; }
    label { display: block; font-weight: bold; margin-bottom: 0.25rem; }
    input[type="text"], input[type="email"], input[type="password"] { width: 100%; padding: 0.4rem; font-size: 1rem; box-sizing: border-box; }
    button { padding: 0.5rem 1.5rem; font-size: 1rem; cursor: pointer; }
    dialog { padding: 2rem; border: 1px solid #ddd; border-radius: 6px; min-width: 400px; }
    dialog h2 { margin-top: 0; }`,
    body: `
  <p><a href="/">&larr; Back</a></p>
  <h1>${client.name}</h1>
  <dl>
    <dt>Type</dt><dd>${client.app_type}</dd>
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
  connections: Connection[]
): string {
  const dbConnections = getDatabaseConnections(connections);

  if (dbConnections.length === 0) {
    return `<h2>Self-Service</h2>
  <p>No database connection is configured for this client. Self-service features require a database connection.</p>`;
  }

  return `<h2>Self-Service</h2>
  <p><a href="/change-password-email/${client.client_id}"><button>Change Password (email)</button></a></p>`;
}

function renderLoginPage(
  client: Auth0Client,
  tenantConfig: TenantConfig,
  connections: Connection[],
  grants: ClientGrant[],
  loginMethod: LoginMethod
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

  const { customDomains, tenantDomain } = tenantConfig;
  const loginButtons =
    customDomains.length > 0
      ? `<div style="display:flex;gap:1rem;flex-wrap:wrap;">
      ${customDomains.map((d) => `<button type="submit" name="login_domain" value="${d}">Login (${d})</button>`).join("\n      ")}
      <button type="submit" name="login_domain" value="${tenantDomain}">Login (auth0.com)</button>
    </div>`
      : `<button type="submit">Login</button>`;

  const frontendNote =
    method === "frontend"
      ? `<p><em>This app uses frontend login. The authorization code exchange happens in the browser - no client secret is used.</em></p>`
      : "";

  return pageLayout({
    title: `${client.name} — ${tenantConfig.friendlyName}`,
    tenantConfig,
    maxWidth: "700px",
    styles: `
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; margin: 1rem 0; }
    dt { font-weight: bold; color: #555; }
    form { display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem; }
    label { display: block; font-weight: bold; margin-bottom: 0.25rem; }
    select, textarea { width: 100%; padding: 0.4rem; font-size: 1rem; box-sizing: border-box; }
    textarea { font-family: monospace; height: 6rem; }
    button { align-self: flex-start; padding: 0.5rem 1.5rem; font-size: 1rem; cursor: pointer; }`,
    body: `
  <p><a href="/">&larr; Back</a></p>
  <h1>${client.name}</h1>
  <dl>
    <dt>Type</dt><dd>${client.app_type}</dd>
    <dt>Grants</dt><dd>${client.grant_types.join(", ")}</dd>
    <dt>Login method</dt><dd>${method}</dd>
  </dl>
  ${frontendNote}
  ${grantsSection}
  <form method="get" action="/login/${client.client_id}">
    ${connectionSelect}
    <div>
      <label for="extra_params">Extra parameters</label>
      <textarea id="extra_params" name="extra_params" placeholder="screen_hint=signup&#10;prompt=login"></textarea>
    </div>
    ${loginButtons}
  </form>
  ${renderSelfServiceSection(client, connections)}`,
  });
}

export function renderClientPage({
  response,
  env,
}: {
  response: Response;
  env: NodeJS.ProcessEnv;
}) {
  const tenantConfig = readTenantConfig(response.locals.tenantDataDir, env);
  const connections = readConnections(response.locals.tenantDataDir);
  if (response.locals.client!.app_type === "non_interactive") {
    const grants = readGrants(response.locals.tenantDataDir);
    return response.send(
      renderM2MPage(
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
    renderLoginPage(
      response.locals.client!,
      tenantConfig,
      connections,
      response.locals.grants,
      loginMethod
    )
  );
}
