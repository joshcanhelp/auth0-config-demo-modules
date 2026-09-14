import type { Request, Response } from "express";

import { preprocessFormBody } from "./preprocessFormBody.js";
import { readTenantConfig } from "./readTenantConfig.js";
import { renderCreateUserPage } from "./pages/renderCreateUserPage.js";
import type { TenantUserBody } from "../types.js";

export async function handleCreateUser({
  request,
  response,
  env,
}: {
  request: Request;
  response: Response;
  env: NodeJS.ProcessEnv;
}) {
  const api = response.locals.managementApi!;
  const clientId = response.locals.client!.client_id;
  const tenantConfig = readTenantConfig(response.locals.tenantDataDir, env);

  const sendError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    response
      .status(400)
      .send(renderCreateUserPage(clientId, null, tenantConfig, message));
  };

  let body: Record<string, unknown>;
  try {
    body = preprocessFormBody(request.body as Record<string, unknown>);
  } catch (error) {
    return sendError(error);
  }

  let dbResult: Record<string, unknown>;
  try {
    dbResult = await api.createUser(body as TenantUserBody);

    // TODO: work this into a solution
    // emailResult = await api.createUser({
    //   ...body,
    //   connection: "email",
    // } as TenantUserBody);
    // linkResult = await api.linkUser((dbResult as { user_id: string }).user_id, {
    //   provider: "email",
    //   user_id: (emailResult as { user_id: string }).user_id,
    // });
    // loginResult = await response.locals.authenticationApi!.startPasswordless(
    //   "email",
    //   "link",
    //   body.email as string,
    //   {
    //     client_id: "fjwCjG3YrB9wqQ6ikUllCwy3BTgdCuhi",
    //     redirect_uri: "http://localhost:8473/callback/fjwCjG3YrB9wqQ6ikUllCwy3BTgdCuhi",
    //     reponse_type: "code",
    //     scope: "openid profile email",
    //   }
    // );
  } catch (error) {
    return sendError(error);
  }

  response.send(renderCreateUserPage(clientId, dbResult, tenantConfig));
}
