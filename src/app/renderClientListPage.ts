import { detectLoginMethod } from "./detectLoginMethod.js";
import { pageLayout } from "./pageLayout.js";
import type { Auth0Client } from "../types.js";
import type { Response } from "express";
import { readClients } from "./readClients.js";
import { readTenantConfig } from "./readTenantConfig.js";

export function renderClientListPage({
  response: res,
  env,
}: {
  response: Response;
  env: NodeJS.ProcessEnv;
}) {
  const tenantConfig = readTenantConfig(res.locals.tenantDataDir, env);
  const clients: Auth0Client[] = readClients(res.locals.tenantDataDir);
  const clientRows = clients
    .filter((client) => client.client_metadata?.hide_from_demo !== "true")
    .map((client) => {
      const isM2M = client.app_type === "non_interactive";
      const logoHtml = client.logo_uri
        ? `<img src="${client.logo_uri}" alt="${client.name} logo" height="32" style="vertical-align:middle;margin-right:8px;">`
        : "";
      const actionHtml = isM2M ? "" : `<a href="/login/${client.client_id}">Login</a>`;
      const methodHtml = isM2M ? "" : detectLoginMethod(client, env);
      return `
      <tr>
        <td>${logoHtml}<a href="/client/${client.client_id}">${client.name}</a></td>
        <td>${client.app_type}</td>
        <td>${client.grant_types.join(", ")}</td>
        <td>${methodHtml}</td>
        <td>${actionHtml}</td>
      </tr>`;
    })
    .join("\n");

  res.send(
    pageLayout({
      title: `${tenantConfig.friendlyName} — Demo`,
      tenantConfig,
      styles: `
    table { border-collapse: collapse; width: 100%; }
    th, td { text-align: left; padding: 0.5rem 1rem; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }`,
      body: `
  <div style="display:flex;justify-content:space-between;align-items:baseline;">
    <h1>${tenantConfig.friendlyName}</h1>
  </div>
  <table>
    <thead>
      <tr>
        <th>Application</th>
        <th>Type</th>
        <th>Grants</th>
        <th>Login Method</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      ${clientRows}
    </tbody>
  </table>`,
    })
  );
}
