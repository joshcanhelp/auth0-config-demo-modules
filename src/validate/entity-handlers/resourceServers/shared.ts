import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

export type CheckmateFlatItem = { name?: string; field: string; status: string; value?: string };
export type CheckmateFlatResult = { details: CheckmateFlatItem[] };
export type CheckmateFlatFn = (options: {
  resourceServers: unknown[];
}) => Promise<CheckmateFlatResult>;

export type CheckmateNestedReport = { name: string; report: CheckmateFlatItem[] };
export type CheckmateNestedResult = { details: CheckmateNestedReport[] };
export type CheckmateNestedFn = (options: {
  resourceServers: unknown[];
}) => Promise<CheckmateNestedResult>;

export function loadFlatCheck(filename: string): CheckmateFlatFn {
  return _require(`auth0-checkmate/analyzer/lib/resource_servers/${filename}`) as CheckmateFlatFn;
}

export function loadNestedCheck(filename: string): CheckmateNestedFn {
  return _require(
    `auth0-checkmate/analyzer/lib/resource_servers/${filename}`
  ) as CheckmateNestedFn;
}
