import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

const checkEventStreams = loadCheck("checkEventStreams.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  event_streams_stream_disabled: {
    level: "informational",
    description: "An event stream is not in an active/enabled status.",
    property: "event_streams",
  },
};

export async function checkEventStreamsStreamDisabled(
  eventStreams: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkEventStreams({ eventStreams });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "event_stream_disabled") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "event_streams_stream_disabled",
        item.name ?? "Unknown Stream",
        `event_streams: Stream "${item.name}" (${item.type}) has status "${item.stream_status}".`
      )
    );
  }

  return findings;
}
