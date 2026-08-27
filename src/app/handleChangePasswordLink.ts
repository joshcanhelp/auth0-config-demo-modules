import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";

import { detectLoginMethod } from "./detectLoginMethod.js";
import { pageLayout } from "./pageLayout.js";
import { readTenantConfig } from "./readTenantConfig.js";
import { readClients } from "./readClients.js";
import { getClientCredentialsTokenResponse } from "../auth0/clientCredentials.js";
import { createManagementApi } from "../auth0/apiManagement.js";

const dir = dirname(fileURLToPath(import.meta.url));

const PAGE_STYLES = `
  .steps p { margin: 0.25rem 0; }
  .ticket-link { margin-top: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 4px; word-break: break-all; }`;

interface Step {
  label: string;
  success: boolean;
  detail?: string;
}

function stepHtml(step: Step): string {
  const color = step.success ? "#1a7f37" : "#cf222e";
  const marker = step.success ? "✓" : "✗";
  const detail = step.detail ? `: ${step.detail}` : "";
  return `<p style="color:${color};">${marker} ${step.label}${detail}</p>`;
}

// https://auth0.com/docs/api/management/v2/tickets/post-password-change
async function runValidation(
  auth0Domain: string,
  clientId: string,
  clientSecret: string | undefined,
  hasClientCredentials: boolean,
  userId: string | undefined
): Promise<{ steps: Step[]; ticket?: string }> {
  const steps: Step[] = [];

  steps.push({
    label: "Client has client_credentials grant",
    success: hasClientCredentials,
  });
  if (!hasClientCredentials) return { steps };

  steps.push({ label: "Client secret is configured", success: Boolean(clientSecret) });
  if (!clientSecret) return { steps };

  let tokenResponse;
  try {
    tokenResponse = await getClientCredentialsTokenResponse(
      auth0Domain,
      clientId,
      clientSecret
    );
    steps.push({ label: "Token request successful", success: true });
  } catch (err) {
    steps.push({
      label: "Token request failed",
      success: false,
      detail: err instanceof Error ? err.message : String(err),
    });
    return { steps };
  }

  const scopes = tokenResponse.scope?.split(" ") ?? [];
  const hasScope = scopes.includes("create:user_tickets");
  steps.push({ label: "Token has create:user_tickets scope", success: hasScope });
  if (!hasScope) return { steps };

  steps.push({ label: "User is logged in", success: Boolean(userId) });
  if (!userId) return { steps };

  try {
    const mgmt = createManagementApi(auth0Domain, tokenResponse.access_token);
    const result = (await mgmt.createPasswordTicket({ user_id: userId })) as {
      ticket?: string;
    };
    steps.push({ label: "Password change ticket created", success: true });
    return { steps, ticket: result.ticket };
  } catch (err) {
    steps.push({
      label: "Create ticket failed",
      success: false,
      detail: err instanceof Error ? err.message : String(err),
    });
    return { steps };
  }
}

export async function handleChangePasswordLink({
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
  const auth0Domain = response.locals.auth0Domain;
  const backLink = `<p><a href="/client/${client.client_id}">&larr; Back</a></p>`;

  // POST from SPA browser script: use BFF client credentials, return JSON steps
  if (request.method === "POST") {
    const userId = (request.body as Record<string, unknown>)?.user_id as
      string | undefined;
    const bffClientId = client.client_metadata?.bff_client_id as string | undefined;
    const steps: Step[] = [];

    if (!bffClientId) {
      steps.push({
        label: "BFF client found (bff_client_id in client_metadata)",
        success: false,
      });
      response.json({ steps });
      return;
    }

    const bffClient = readClients(response.locals.tenantDataDir).find(
      (c) => c.client_id === bffClientId
    );

    steps.push({
      label: "BFF client found (bff_client_id in client_metadata)",
      success: Boolean(bffClient),
    });

    if (!bffClient) {
      response.json({ steps });
      return;
    }

    const hasGrant = bffClient.grant_types.includes("client_credentials");
    const secret = env[`CLIENT_ID_${bffClientId}_SECRET`] as string | undefined;
    const { steps: runSteps, ticket } = await runValidation(
      auth0Domain,
      bffClientId,
      secret,
      hasGrant,
      userId
    );

    response.json({ steps: [...steps, ...runSteps], ticket });
    return;
  }

  // GET: backend client - run validation server-side and render results
  if (loginMethod === "backend") {
    const hasGrant = client.grant_types.includes("client_credentials");
    const secret = env[`CLIENT_ID_${client.client_id}_SECRET`] as string | undefined;
    const userId = request.session.auth0UserId;

    const { steps, ticket } = await runValidation(
      auth0Domain,
      client.client_id,
      secret,
      hasGrant,
      userId
    );

    const stepsHtml = steps.map(stepHtml).join("\n    ");
    const ticketHtml = ticket
      ? `<div class="ticket-link"><strong>Password change link:</strong><br><a href="${ticket}">${ticket}</a></div>`
      : "";

    return response.send(
      pageLayout({
        title: `Change Password Link - ${client.name}`,
        tenantConfig,
        maxWidth: "700px",
        styles: PAGE_STYLES,
        body: `${backLink}
  <h1>Change Password Link - ${client.name}</h1>
  <div class="steps">
    ${stepsHtml}
  </div>
  ${ticketHtml}`,
      })
    );
  }

  // GET: SPA/native - check for BFF then render page with browser script
  const bffClientId = client.client_metadata?.bff_client_id as string | undefined;

  if (!bffClientId) {
    return response.send(
      pageLayout({
        title: `Change Password Link - ${client.name}`,
        tenantConfig,
        maxWidth: "700px",
        body: `${backLink}
  <h1>Change Password Link - ${client.name}</h1>
  <p>No <code>bff_client_id</code> found in client metadata. Add a BFF client ID to use this feature for SPA/native clients.</p>`,
      })
    );
  }

  const changePasswordLinkScript = readFileSync(
    join(dir, "browser", "changePasswordLink.js"),
    "utf-8"
  );
  const pageConfig = JSON.stringify({ clientId: client.client_id });

  return response.send(
    pageLayout({
      title: `Change Password Link - ${client.name}`,
      tenantConfig,
      maxWidth: "700px",
      styles: PAGE_STYLES,
      body: `${backLink}
  <h1>Change Password Link - ${client.name}</h1>
  <div id="status"></div>
  <div class="steps" id="steps"></div>
  <div id="ticket-section"></div>
  <script id="change-password-link-config" type="application/json">${pageConfig}</script>
  <script>${changePasswordLinkScript}</script>`,
    })
  );
}
