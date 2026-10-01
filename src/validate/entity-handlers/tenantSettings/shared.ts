import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

export type CheckmateItem = {
  field: string;
  status: string;
  value?: string | number;
  attr?: string;
};
export type CheckmateResult = { details: CheckmateItem[] };
export type CheckmateFn = (options: { tenant: unknown }) => Promise<CheckmateResult>;

export function loadCheck(filename: string): CheckmateFn {
  return _require(`auth0-checkmate/analyzer/lib/tenant_settings/${filename}`) as CheckmateFn;
}
