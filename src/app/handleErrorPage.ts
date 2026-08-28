import type { Request, Response } from "express";

import { pageLayout } from "./pages/pageLayout.js";
import { readTenantConfig } from "./readTenantConfig.js";

// https://auth0.com/docs/customize/login-pages/custom-error-pages
export function handleErrorPage({
  request,
  response,
  env,
}: {
  request: Request;
  response: Response;
  env: NodeJS.ProcessEnv;
}) {
  const tenantConfig = readTenantConfig(response.locals.tenantDataDir, env);
  const { error, error_description, tracking, client_id, connection, lang } =
    request.query as Record<string, string | undefined>;

  const rows = [
    ["Error", error],
    ["Description", error_description],
    ["Tracking ID", tracking],
    ["Client ID", client_id],
    ["Connection", connection],
    ["Language", lang],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`)
    .join("\n    ");

  return response.status(400).send(
    pageLayout({
      title: `Error — ${tenantConfig.friendlyName}`,
      tenantConfig,
      maxWidth: "700px",
      styles: `
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; margin: 1rem 0; }
    dt { font-weight: bold; color: #555; }
    dd { word-break: break-all; }`,
      body: `
  <h1>Something went wrong</h1>
  <dl>
    ${rows}
  </dl>
  <p><a href="/">&larr; Back to app list</a></p>`,
    })
  );
}
