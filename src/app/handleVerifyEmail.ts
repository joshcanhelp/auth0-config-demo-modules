import type { Request, Response } from "express";

import { pageLayout } from "./pages/pageLayout.js";
import { readTenantConfig } from "./readTenantConfig.js";
import { getClientCredentialsTokenResponse } from "../auth0/clientCredentials.js";
import { createManagementApi } from "../auth0/apiManagement.js";

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
  const backLink = `<p><a href="/client/${client.client_id}">&larr; Back</a></p>`;

  const userId = request.session.auth0UserId;
  if (!userId) {
    return response.send(
      pageLayout({
        title: `Verify Email - ${client.name}`,
        tenantConfig,

        body: `${backLink}
  <h1>Verify Email - ${client.name}</h1>
  <p>No user is logged in. <a href="/login/${client.client_id}">Please login</a> to use this feature.</p>`,
      })
    );
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

  const stepsHtml = steps.map(stepHtml).join("\n    ");
  const sentHtml = sent
    ? `<p style="color:#1a7f37;">&#10003; Verification email sent.</p>`
    : "";

  return response.send(
    pageLayout({
      title: `Verify Email - ${client.name}`,
      tenantConfig,

      body: `${backLink}
  <h1>Verify Email - ${client.name}</h1>
  <div class="steps">
    ${stepsHtml}
  </div>
  ${sentHtml}`,
    })
  );
}
