function isInsufficientScopeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.message.includes("insufficient_scope")) return true;
  return isInsufficientScopeError(err.cause);
}

export async function withRetryOnInsufficientScope(
  fetchToken: () => Promise<string>,
  clearCache: () => void,
  fn: (token: string) => Promise<void>
): Promise<void> {
  const token = await fetchToken();
  try {
    await fn(token);
  } catch (err) {
    if (!isInsufficientScopeError(err)) throw err;
    clearCache();
    const freshToken = await fetchToken();
    await fn(freshToken);
  }
}
