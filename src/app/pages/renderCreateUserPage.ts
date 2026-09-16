import { pageLayout } from "./pageLayout.js";
import type { TenantConfig } from "../../types.js";

export function renderCreateUserPage(
  clientId: string,
  result: Record<string, unknown> | null,
  tenantConfig: TenantConfig,
  error?: string
): string {
  const body = error
    ? `<p><a href="/client/${clientId}">&larr; Back to client</a></p>
  <h2>User creation failed</h2>
  <p style="color:red">${error}</p>`
    : `<p><a href="/client/${clientId}">&larr; Back to client</a></p>
  <h2>User created</h2>
  <pre>${JSON.stringify(result, null, 2)}</pre>`;

  return pageLayout({
    title: "Create User",
    tenantConfig,
    body,
  });
}
