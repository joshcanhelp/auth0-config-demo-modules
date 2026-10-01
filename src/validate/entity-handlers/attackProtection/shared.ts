import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

export interface AttackProtectionConfig {
  breachedPasswordDetection?: unknown;
  bruteForceProtection?: unknown;
  suspiciousIpThrottling?: unknown;
}

export type CheckmateItem = { field: string; status: string; value?: string | number | boolean };
export type CheckmateResult = { details: CheckmateItem[] };
export type CheckmateFn = (options: { attackProtection: unknown }) => Promise<CheckmateResult>;

export function loadCheck(filename: string): CheckmateFn {
  return _require(`auth0-checkmate/analyzer/lib/attack_protection/${filename}`) as CheckmateFn;
}
