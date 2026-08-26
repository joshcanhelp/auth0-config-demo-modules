import type { Request, Response } from "express";

import { preprocessFormBody } from "./preprocessFormBody.js";
import { readTenantConfig } from "./readTenantConfig.js";
import { renderCreateUserPage } from "./renderCreateUserPage.js";
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
  const body = preprocessFormBody(request.body as Record<string, unknown>);

  const dbResult = await api.createUser(body as TenantUserBody);

  const emailResult = await api.createUser({
    ...body,
    connection: "email",
  } as TenantUserBody);

  const linkResult = await api.linkUser((dbResult as { user_id: string }).user_id, {
    provider: "email",
    user_id: (emailResult as { user_id: string }).user_id,
  });

  const loginResult = await response.locals.authenticationApi!.startPasswordless(
    "email",
    "link",
    body.email as string,
    {
      client_id: "fjwCjG3YrB9wqQ6ikUllCwy3BTgdCuhi",
      redirect_uri: "http://localhost:8473/callback/fjwCjG3YrB9wqQ6ikUllCwy3BTgdCuhi",
      reponse_type: "code",
      scope: "openid profile email",
    }
  );

  const tenantConfig = readTenantConfig(response.locals.tenantDataDir, env);
  response.send(
    renderCreateUserPage(
      clientId,
      { dbResult, emailResult, linkResult, loginResult },
      tenantConfig
    )
  );
}
