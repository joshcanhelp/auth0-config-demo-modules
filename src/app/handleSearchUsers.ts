import type { Request, Response } from "express";

import { readTenantConfig } from "./readTenantConfig.js";
import { renderSearchUsersPage } from "./pages/renderSearchUsersPage.js";

export async function handleSearchUsers({
  request,
  response,
  env,
}: {
  request: Request;
  response: Response;
  env: NodeJS.ProcessEnv;
}) {
  const client = response.locals.client!;
  const tenantConfig = readTenantConfig(response.locals.tenantDataDir, env);
  const query = (request.body as Record<string, string>).query ?? "";
  const users = await response.locals.managementApi!.getUsers(query);
  response.send(renderSearchUsersPage(client, tenantConfig, query, users));
}
