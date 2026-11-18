import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";

import { renderLiquidFile } from "../../liquidEngine.js";
import { pageLayout } from "../../pageLayout.js";
import { readTenantConfig } from "../../readTenantConfig.js";
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

// https://auth0.com/docs/api/management/v2/jobs/post-verification-email
async function runValidation(
  auth0Domain: string,
  clientId: string,
  clientSecret: string | undefined,
  hasClientCredentials: boolean,
  userId: string | undefined
): Promise<{ steps: Step[]; sent: boolean }> {
  const steps: Step[] = [];

  steps.push({
    label: "Client has client_credentials grant",
    success: hasClientCredentials,
  });
  if (!hasClientCredentials) return { steps, sent: false };

  steps.push({ label: "Client secret is configured", success: Boolean(clientSecret) });
  if (!clientSecret) return { steps, sent: false };

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
    return { steps, sent: false };
  }

  const scopes = tokenResponse.scope?.split(" ") ?? [];
  const hasScope = scopes.includes("update:users");
  steps.push({ label: "Token has update:users scope", success: hasScope });
  if (!hasScope) return { steps, sent: false };

  steps.push({ label: "User is logged in", success: Boolean(userId) });
  if (!userId) return { steps, sent: false };

  try {
    const mgmt = createManagementApi(auth0Domain, tokenResponse.access_token);
    await mgmt.createVerificationEmailJob(userId, clientId);
    steps.push({ label: "Verification email job created", success: true });
    return { steps, sent: true };
  } catch (err) {
    steps.push({
      label: "Create verification email job failed",
      success: false,
      detail: err instanceof Error ? err.message : String(err),
    });
    return { steps, sent: false };
  }
}

export async function handleVerifyEmail({
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
  const auth0Domain = response.locals.auth0Domain;

  const send = async (data: Record<string, unknown>) => {
    const body = await renderLiquidFile(join(dir, "render.liquid"), {
      clientId: client.client_id,
      clientName: client.name,
      ...data,
    });
    return response.send(
      pageLayout({ title: `Verify Email - ${client.name}`, tenantConfig, body })
    );
  };

  const userId = request.session.auth0UserId;
  if (!userId) {
    return send({ state: "no-user" });
  }

  const hasGrant = client.grant_types.includes("client_credentials");
  const secret = env[`CLIENT_ID_${client.client_id}_SECRET`] as string | undefined;

  const { steps, sent } = await runValidation(
    auth0Domain,
    client.client_id,
    secret,
    hasGrant,
    userId
  );

  return send({ state: "result", steps, sent });
}
