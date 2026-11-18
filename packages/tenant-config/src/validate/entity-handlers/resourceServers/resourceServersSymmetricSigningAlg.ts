import { buildFinding } from "../../utils/finding.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import { loadNestedCheck } from "./shared.js";

const checkAPISigningAlgorithm = loadNestedCheck("checkAPISigningAlgorithm.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  resource_servers_symmetric_signing_alg: {
    level: "important",
    description:
      "API tokens are signed with HS256, a symmetric algorithm. Use RS256 or another asymmetric algorithm.",
    property: "signing_alg",
  },
};

export async function checkResourceServersSymmetricSigningAlg(
  resourceServers: unknown[]
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const result = await checkAPISigningAlgorithm({ resourceServers });

  for (const apiReport of result.details) {
    for (const item of apiReport.report) {
      if (item.status !== "red" || item.field !== "using_symmetric_alg") continue;
      findings.push(
        buildFinding(
          DEFINITIONS,
          "resource_servers_symmetric_signing_alg",
          apiReport.name,
          "signing_alg: API tokens are signed with HS256, a symmetric algorithm. Use RS256 or another asymmetric algorithm."
        )
      );
    }
  }

  return findings;
}
