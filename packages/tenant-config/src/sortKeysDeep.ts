// Recursively sorts object keys alphabetically, at every depth, so a pulled record's JSON is
// stable and diffable regardless of whatever order the Management API happened to return fields
// in. Arrays keep their element order - only object keys get sorted (including in objects nested
// inside arrays).
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortKeysDeep(source[key]);
    }
    return sorted;
  }
  return value;
}
