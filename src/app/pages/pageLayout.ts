import { buildDashboardUrl } from "../buildDashboardUrl.js";
import type { TenantConfig } from "../../types.js";

interface PageOptions {
  title: string;
  body: string;
  tenantConfig: TenantConfig;
  styles?: string;
  maxWidth?: string;
  logoutUrl?: string;
}

export function pageLayout({ title, body, tenantConfig }: PageOptions): string {
  const dashboardUrl = buildDashboardUrl(tenantConfig.tenantDomain);
  const navLinks: string[] = [`<a href="/">Home</a>`, `<a href="/logout">Logout</a>`];
  if (dashboardUrl)
    navLinks.push(
      `<a href="${dashboardUrl}" target="_blank" rel="noopener noreferrer">Dashboard</a>`
    );
  const dashboardNav =
    navLinks.length > 0
      ? `<nav style="text-align:right;margin-bottom:0.5rem;font-size:0.9rem;">${navLinks.join(" &bull; ")}</nav>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.classless.min.css">
  <style>
    :root { --pico-font-size: 14px; }
    body { max-width: 700px; margin: 2rem auto; padding: 0 1rem; }
    button, [type="submit"] { padding: 0.4rem 0.9rem; width: auto; }
    .steps p { margin: 0.25rem 0; }
    .ticket-link { margin-top: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 4px; word-break: break-all; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  ${dashboardNav}
  ${body}
</body>
</html>`;
}
