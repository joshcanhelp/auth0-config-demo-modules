import { buildDashboardUrl } from "./buildDashboardUrl.js";
import type { TenantConfig } from "../types.js";

interface PageOptions {
  title: string;
  body: string;
  tenantConfig: TenantConfig;
  styles?: string;
  maxWidth?: string;
  logoutUrl?: string;
}

export function pageLayout({
  title,
  body,
  tenantConfig,
  styles = "",
  maxWidth = "900px",
}: PageOptions): string {
  const dashboardUrl = buildDashboardUrl(tenantConfig.tenantDomain);
  const navLinks: string[] = [`<a href="/logout">Logout</a>`];
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
  <style>
    body { font-family: sans-serif; max-width: ${maxWidth}; margin: 2rem auto; padding: 0 1rem; }
    a { color: #206ef6; }
    ${styles}
  </style>
</head>
<body>
  ${dashboardNav}
  ${body}
</body>
</html>`;
}
