import assert from "node:assert";

import type { Finding, ValidationDefinition } from "./types.js";

// Builds a Finding from a handler's DEFINITIONS map so the level always matches
// the code's single-sourced definition instead of being repeated at each call site.
export function buildFinding<Definitions extends Record<string, ValidationDefinition>>(
  definitions: Definitions,
  code: keyof Definitions & string,
  clientName: string,
  message: string,
  extra?: Partial<Pick<Finding, "clientId" | "field" | "value">>
): Finding {
  const definition = definitions[code];
  assert(definition, `Unknown validation code: ${code}`);
  return { code, level: definition.level, clientName, message, ...extra };
}
