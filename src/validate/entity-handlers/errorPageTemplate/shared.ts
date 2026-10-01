import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

export type CheckmateItem = { field: string; status: string; value?: string };
export type CheckmateResult = { details: CheckmateItem[] };
export type CheckmateFn = (options: { errorPageTemplate: string }) => Promise<CheckmateResult>;

export function loadCheck(filename: string): CheckmateFn {
  return _require(
    `auth0-checkmate/analyzer/lib/error_page_template/${filename}`
  ) as CheckmateFn;
}
