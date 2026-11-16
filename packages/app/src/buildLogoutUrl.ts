export function buildLogoutUrl({
  loginDomain,
  clientId,
  returnTo,
}: {
  loginDomain: string;
  clientId?: string;
  returnTo?: string;
}): string {
  const params = new URLSearchParams({
    ...(clientId ? { client_id: clientId } : {}),
    ...(returnTo ? { returnTo } : {}),
  });
  return `https://${loginDomain}/v2/logout?${params.toString()}`;
}
