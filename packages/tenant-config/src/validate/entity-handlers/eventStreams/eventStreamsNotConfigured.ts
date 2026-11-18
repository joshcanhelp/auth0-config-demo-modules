import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadCheck } from "./shared.js";

const checkEventStreams = loadCheck("checkEventStreams.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  event_streams_not_configured: {
    level: "informational",
    description: "No event streams are configured.",
    property: "event_streams",
  },
};

export async function checkEventStreamsNotConfigured(
  eventStreams: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkEventStreams({ eventStreams });

  for (const item of result.details) {
    if (item.status !== "red" || item.field !== "event_stream_not_configured") continue;
    findings.push(
      buildFinding(
        DEFINITIONS,
        "event_streams_not_configured",
        "Event Streams",
        "event_streams: No event streams are configured."
      )
    );
  }

  return findings;
}
