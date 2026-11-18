import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { renderLiquidFile } from "../../liquidEngine.js";
import { pageLayout } from "../../pageLayout.js";
import type { TenantConfig } from "../../types.js";

const dir = dirname(fileURLToPath(import.meta.url));

export async function renderCreateUserPage(
  clientId: string,
  result: Record<string, unknown> | null,
  tenantConfig: TenantConfig,
  error?: string
): Promise<string> {
  const body = await renderLiquidFile(join(dir, "render.liquid"), {
    clientId,
    error: error ?? null,
    resultJson: error ? null : JSON.stringify(result, null, 2),
  });

  return pageLayout({
    title: "Create User",
    tenantConfig,
    body,
  });
}
