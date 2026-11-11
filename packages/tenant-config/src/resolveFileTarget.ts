import { strict as assert } from "node:assert";
import { relative, sep } from "node:path";

export interface FileTarget {
  tenantName: string;
  entityName: string;
  // Without the .json extension - matches EntityDefinition.fileName's own output, so a re-pulled
  // record can be written back to the exact same path it was read from.
  baseFileName: string;
}

// Takes absolute paths so the caller (which already knows the cwd/tenants root) owns resolving
// a --file flag's value - this just works out which tenant/entity/file that path refers to.
export function resolveFileTarget(
  absoluteFilePath: string,
  absoluteTenantsRoot: string
): FileTarget {
  const relativePath = relative(absoluteTenantsRoot, absoluteFilePath);
  const segments = relativePath.split(sep);
  assert(
    segments.length === 3 && !segments.includes(".."),
    `--file must point to a file directly inside a tenant's entity directory ` +
      `(tenants/<tenant>/<entity>/<file>.json) - got "${absoluteFilePath}"`
  );

  const [tenantName, entityName, fileName] = segments;
  assert(
    fileName.endsWith(".json"),
    `--file must point to a .json file - got "${fileName}"`
  );

  return { tenantName, entityName, baseFileName: fileName.slice(0, -".json".length) };
}
