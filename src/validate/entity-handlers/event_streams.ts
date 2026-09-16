import { createRequire } from "node:module";

import { buildFinding } from "../finding.js";
import type { Finding, ValidationDefinition } from "../types.js";
import type { TenantTag } from "./clients.js";

const _require = createRequire(import.meta.url);

type FlatItem = {
  field: string;
  status: string;
  name?: string;
  type?: string;
  stream_status?: string;
};
type FlatResult = { details: FlatItem[] };
type CheckFn = (options: { eventStreams: unknown[] }) => Promise<FlatResult>;

const checkEventStreams = _require(
  "auth0-checkmate/analyzer/lib/event_streams/checkEventStreams.js"
) as CheckFn;

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  event_streams_not_configured: {
    level: "informational",
    description: "event_streams: No event streams are configured.",
  },
  event_streams_stream_disabled: {
    level: "informational",
    description: "event_streams: An event stream is not in an active/enabled status.",
  },
};

export async function validateEventStreams(
  eventStreams: unknown[],
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkEventStreams({ eventStreams });

  for (const item of result.details) {
    if (item.status !== "red") continue;
    switch (item.field) {
      case "event_stream_not_configured":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "event_streams_not_configured",
            "Event Streams",
            "event_streams: No event streams are configured."
          )
        );
        break;
      case "event_stream_disabled":
        findings.push(
          buildFinding(
            DEFINITIONS,
            "event_streams_stream_disabled",
            item.name ?? "Unknown Stream",
            `event_streams: Stream "${item.name}" (${item.type}) has status "${item.stream_status}".`
          )
        );
        break;
      default:
        throw new Error(`Unknown event stream check field: ${item.field}`);
    }
  }

  return findings;
}
