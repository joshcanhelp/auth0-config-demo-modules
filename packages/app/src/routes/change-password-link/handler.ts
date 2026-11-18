import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";

import { detectLoginMethod } from "../../detectLoginMethod.js";
import { renderLiquidFile } from "../../liquidEngine.js";
import { pageLayout } from "../../pageLayout.js";
import { readTenantConfig } from "../../readTenantConfig.js";
import { readClients } from "../../readClients.js";
import {
  getClientCredentialsTokenResponse,
  createManagementApi,
} from "auth0-config-demo-modules/packages/core/src/index.js";

const dir = dirname(fileURLToPath(import.meta.url));

interface Step {
  label: string;
  success: boolean;
  detail?: string;
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

  const send = async (data: Record<string, unknown>) => {
    const body = await renderLiquidFile(join(dir, "render.liquid"), {
      clientId: client.client_id,
      clientName: client.name,
      ...data,
    });
    return response.send(
      pageLayout({ title: `Change Password Link - ${client.name}`, tenantConfig, body })
    );
  };

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

    return send({ state: "backend-result", steps, ticket });
  }

  // GET: SPA/native - check for BFF then render page with browser script
  const bffClientId = client.client_metadata?.bff_client_id as string | undefined;

  if (!bffClientId) {
    return send({ state: "no-bff" });
  }

  const changePasswordLinkScript = readFileSync(
    join(dir, "..", "..", "browser", "changePasswordLink.js"),
    "utf-8"
  );
  const pageConfigJson = JSON.stringify({ clientId: client.client_id });

  return send({ state: "script", pageConfigJson, changePasswordLinkScript });
}
