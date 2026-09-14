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
    maxWidth: "700px",
    styles: `pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; }`,
    body,
  });
}
