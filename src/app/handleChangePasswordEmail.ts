import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";

import { detectLoginMethod } from "./detectLoginMethod.js";
import { pageLayout } from "./pageLayout.js";
import { readTenantConfig } from "./readTenantConfig.js";
import { readConnections } from "./readConnections.js";

const dir = dirname(fileURLToPath(import.meta.url));

export async function handleChangePasswordEmail({
  request,
  response,
  env,
}: {
  request: Request;
  response: Response;
  env: NodeJS.ProcessEnv;
}) {
  const tenantConfig = readTenantConfig(response.locals.tenantDataDir, env);
  const client = response.locals.client!;
  const loginMethod = detectLoginMethod(client, env);
  const connections = readConnections(response.locals.tenantDataDir);
  const dbConnections = connections.filter((c) => c.strategy === "auth0");

  const backLink = `<p><a href="/client/${client.client_id}">&larr; Back</a></p>`;

  if (dbConnections.length === 0) {
    return response.send(
      pageLayout({
        title: `Change Password - ${client.name}`,
        tenantConfig,
        maxWidth: "700px",
        body: `${backLink}
  <h1>Change Password</h1>
  <p>No database connection is configured for this client. Password change is only supported for database connections.</p>`,
      })
    );
  }

  const connection = String(dbConnections[0].name);

  if (loginMethod === "backend") {
    const userEmail = request.session.auth0UserEmail;
    if (!userEmail) {
      return response.send(
        pageLayout({
          title: `Change Password - ${client.name}`,
          tenantConfig,
          maxWidth: "700px",
          body: `${backLink}
  <h1>Change Password</h1>
  <p>No user is logged in. <a href="/login/${client.client_id}">Please login</a> to use this feature.</p>`,
        })
      );
    }

    try {
      await response.locals.authenticationApi!.changePassword(connection, userEmail);
      return response.send(
        pageLayout({
          title: `Change Password - ${client.name}`,
          tenantConfig,
          maxWidth: "700px",
          body: `${backLink}
  <h1>Change Password</h1>
  <p style="color:#1a7f37;">&#10003; Password change email sent to ${userEmail}. Check your inbox.</p>`,
        })
      );
    } catch (err) {
      return response.send(
        pageLayout({
          title: `Change Password - ${client.name}`,
          tenantConfig,
          maxWidth: "700px",
          body: `${backLink}
  <h1>Change Password</h1>
  <p style="color:#cf222e;">Failed to send password change email: ${err instanceof Error ? err.message : String(err)}</p>`,
        })
      );
    }
  }

  const changePasswordScript = readFileSync(
    join(dir, "browser", "changePasswordEmail.js"),
    "utf-8"
  );
  const pageConfig = JSON.stringify({
    auth0Domain: response.locals.auth0Domain,
    clientId: client.client_id,
    connection,
  });

  return response.send(
    pageLayout({
      title: `Change Password - ${client.name}`,
      tenantConfig,
      maxWidth: "700px",
      body: `${backLink}
  <h1>Change Password - ${client.name}</h1>
  <p id="status"></p>
  <div id="action-section" style="display:none;">
    <p>Logged in as: <strong id="user-email-display"></strong></p>
    <button id="change-password-btn">Send Change Password Email</button>
  </div>
  <script id="change-password-config" type="application/json">${pageConfig}</script>
  <script>${changePasswordScript}</script>`,
    })
  );
}
