import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

export type CheckmateItem = {
  field: string;
  status: string;
  name?: string;
  type?: string;
  stream_status?: string;
};
export type CheckmateResult = { details: CheckmateItem[] };
export type CheckmateFn = (options: { eventStreams: unknown[] }) => Promise<CheckmateResult>;

export function loadCheck(filename: string): CheckmateFn {
  return _require(`auth0-checkmate/analyzer/lib/event_streams/${filename}`) as CheckmateFn;
}
