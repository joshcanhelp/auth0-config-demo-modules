import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

export type CheckmateFlatItem = {
  name?: string;
  field: string;
  status: string;
  value?: string | number;
};
export type CheckmateFlatResult = { details: CheckmateFlatItem[] };
export type CheckmateFlatFn = (options: { databases: unknown[] }) => Promise<CheckmateFlatResult>;

export type CheckmateNestedItem = {
  scriptName?: string;
  variableName?: string;
  field: string;
  status: string;
  line?: string | number;
};
// checkDASHardCodedValues details may contain nested { name, report[] } items or a flat
// fallback item (e.g. no_database_connections_found) when databases is empty.
export type CheckmateNestedReport = { name: string; report: CheckmateNestedItem[] };
export type CheckmateFallbackItem = { field: string; status: string };
export type CheckmateNestedFn = (options: {
  databases: unknown[];
}) => Promise<{ details: (CheckmateNestedReport | CheckmateFallbackItem)[] }>;

export function loadFlatCheck(filename: string): CheckmateFlatFn {
  return _require(`auth0-checkmate/analyzer/lib/databases/${filename}`) as CheckmateFlatFn;
}

export function loadNestedCheck(filename: string): CheckmateNestedFn {
  return _require(`auth0-checkmate/analyzer/lib/databases/${filename}`) as CheckmateNestedFn;
}
