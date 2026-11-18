import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";

import { detectLoginMethod } from "../../detectLoginMethod.js";
import { renderLiquidFile } from "../../liquidEngine.js";
import { pageLayout } from "../../pageLayout.js";
import { readTenantConfig } from "../../readTenantConfig.js";
import { readConnections } from "../../readConnections.js";

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

  const send = async (data: Record<string, unknown>) => {
    const body = await renderLiquidFile(join(dir, "render.liquid"), {
      clientId: client.client_id,
      clientName: client.name,
      ...data,
    });
    return response.send(
      pageLayout({ title: `Change Password - ${client.name}`, tenantConfig, body })
    );
  };

  if (dbConnections.length === 0) {
    return send({ state: "no-db" });
  }

  const connection = String(dbConnections[0].name);

  if (loginMethod === "backend") {
    const userEmail = request.session.auth0UserEmail;
    if (!userEmail) {
      return send({ state: "no-user" });
    }

    try {
      await response.locals.authenticationApi!.changePassword(connection, userEmail);
      return send({ state: "success", userEmail });
    } catch (err) {
      return send({
        state: "error",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const changePasswordScript = readFileSync(
    join(dir, "..", "..", "browser", "changePasswordEmail.js"),
    "utf-8"
  );
  const pageConfigJson = JSON.stringify({
    auth0Domain: response.locals.auth0Domain,
    clientId: client.client_id,
    connection,
  });

  return send({ state: "script", pageConfigJson, changePasswordScript });
}
