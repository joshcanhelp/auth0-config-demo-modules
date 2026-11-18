import type { TenantTag } from "../../utils/tenantTag.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import {
  checkEventStreamsNotConfigured,
  DEFINITIONS as NOT_CONFIGURED_DEFINITIONS,
} from "./eventStreamsNotConfigured.js";
import {
  checkEventStreamsStreamDisabled,
  DEFINITIONS as STREAM_DISABLED_DEFINITIONS,
} from "./eventStreamsStreamDisabled.js";

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  ...NOT_CONFIGURED_DEFINITIONS,
  ...STREAM_DISABLED_DEFINITIONS,
};

export async function validateEventStreams(
  eventStreams: unknown[],
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const results = await Promise.all([
    checkEventStreamsNotConfigured(eventStreams),
    checkEventStreamsStreamDisabled(eventStreams),
  ]);

  return results.flat();
}
