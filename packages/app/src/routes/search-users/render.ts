import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { renderLiquidFile } from "../../liquidEngine.js";
import { pageLayout } from "../../pageLayout.js";
import type { Auth0Client, TenantConfig } from "../../types.js";

const dir = dirname(fileURLToPath(import.meta.url));

function buildUserRow(user: Record<string, unknown>) {
  return {
    name: (user.name as string) ?? (user.username as string) ?? "-",
    email: (user.email as string) ?? "-",
    userId: (user.user_id as string) ?? "-",
  };
}

export async function renderSearchUsersPage(
  client: Auth0Client,
  tenantConfig: TenantConfig,
  query: string,
  users: Record<string, unknown>[]
): Promise<string> {
  const body = await renderLiquidFile(join(dir, "render.liquid"), {
    clientId: client.client_id,
    clientName: client.name,
    friendlyName: tenantConfig.friendlyName,
    query,
    users: users.map(buildUserRow),
  });

  return pageLayout({
    title: `User Search - ${client.name}`,
    tenantConfig,
    body,
  });
}
