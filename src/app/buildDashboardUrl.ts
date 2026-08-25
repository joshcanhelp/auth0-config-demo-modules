export function buildDashboardUrl(tenantDomain: string): string {
  const cicMatch = tenantDomain.match(/^([^.]+)\.cic-demo-platform\.auth0app\.com$/);
  if (cicMatch) {
    return `https://manage.cic-demo-platform.auth0app.com/dashboard/pi/${cicMatch[1]}`;
  }

  const auth0Match = tenantDomain.match(/^([^.]+)\.([^.]+)\.auth0\.com$/);
  if (auth0Match) {
    return `https://manage.auth0.com/dashboard/${auth0Match[2]}/${auth0Match[1]}`;
  }

  return "";
}
