export function preprocessFormBody(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === "" || v === null || v === undefined) continue;
    if (v === "true") {
      result[k] = true;
      continue;
    }
    if (v === "false") {
      result[k] = false;
      continue;
    }
    if (typeof v === "object" && !Array.isArray(v)) {
      const nested = preprocessFormBody(v as Record<string, unknown>);
      if (Object.keys(nested).length > 0) result[k] = nested;
      continue;
    }
    result[k] = v;
  }
  return result;
}
