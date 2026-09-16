import type { Management } from "auth0";
import { createRequire } from "node:module";

import { buildFinding } from "../finding.js";
import type { Finding, ValidationDefinition } from "../types.js";
import assert from "node:assert";

const _require = createRequire(import.meta.url);

export const TENANT_TAGS = ["dev", "stage", "prod"] as const;
export type TenantTag = (typeof TENANT_TAGS)[number];

type CheckmateFn = (options: { clients: unknown[] }) => Promise<CheckmateCheckResult>;
type CheckmateCheckResult = { details: CheckmateClientReport[] };
type CheckmateClientReport = { name: string; report: CheckmateReportItem[] };
type CheckmateReportItem = {
  name: string;
  client_id: string;
  field: string;
  status: string;
  value?: string | boolean | number;
  app_type?: string;
};

function loadCheck(filename: string): CheckmateFn {
  return _require(`auth0-checkmate/analyzer/lib/clients/${filename}`) as CheckmateFn;
}

const checkAllowedCallbacks = loadCheck("checkAllowedCallbacks.js");
const checkAllowedLogoutUrl = loadCheck("checkAllowedLogoutUrl.js");
const checkAppTokenSenderConstraining = loadCheck("checkAppTokenSenderConstraining.js");
const checkApplicationLoginUri = loadCheck("checkApplicationLoginUri.js");
const checkBackchannelLogout = loadCheck("checkBackchannelLogout.js");
const checkCrossOriginAuthentication = loadCheck("checkCrossOriginAuthentication.js");
const checkGrantTypes = loadCheck("checkGrantTypes.js");
const checkJAR = loadCheck("checkJAR.js");
const checkJWTSignAlg = loadCheck("checkJWTSignAlg.js");
const checkPAR = loadCheck("checkPAR.js");
const checkPrivateKeyJWT = loadCheck("checkPrivateKeyJWT.js");
const checkRefreshToken = loadCheck("checkRefreshToken.js");
const checkWebOrigins = loadCheck("checkWebOrigins.js");

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  "clients_insecure_callbacks": {
    level: "important",
    description: "callbacks: Insecure pattern in a callback URL.",
  },
  "clients_insecure_allowed_logout_urls": {
    level: "important",
    description: "allowed_logout_urls: Insecure pattern in a logout URL.",
  },
  "clients_use_rotating_refresh_token": {
    level: "important",
    description:
      "refresh_token.rotation_type: Refresh token rotation is not enabled. Rotating refresh tokens should be used.",
  },
  "clients_insecure_web_origins_urls": {
    level: "important",
    description: "web_origins: Insecure pattern in a web origin.",
  },
  "clients_insecure_initiate_login_uri": {
    level: "important",
    description: "initiate_login_uri: Insecure pattern in initiate_login_uri.",
  },
  "clients_unexpected_grant_type_for_app_type": {
    level: "important",
    description: "grant_types: Unexpected grant types for the application type.",
  },
  "clients_signed_request_object.credentials": {
    level: "important",
    description:
      "signed_request_object.credentials: JAR is required but no signing credentials are configured.",
  },
  "clients_cross_origin_authentication_enabled": {
    level: "important",
    description:
      "cross_origin_authentication: Cross-origin authentication is enabled. This feature has been deprecated by Auth0.",
  },
  "clients_not_using_asymmetric_alg": {
    level: "important",
    description:
      "jwt_configuration.alg: ID tokens are signed with HS256, a symmetric algorithm. Use RS256 or another asymmetric algorithm.",
  },
  "clients_missing_initiate_login_uri": {
    level: "recommended",
    description:
      "initiate_login_uri: No initiate_login_uri configured. Third-party initiated login will not work.",
  },
  "clients_oidc_backchannel_logout.backchannel_logout_urls": {
    level: "recommended",
    description:
      "oidc_logout.backchannel_logout_urls: Back-channel logout is not configured for this server-side web application.",
  },
  "clients_signed_request_object.required": {
    level: "recommended",
    description:
      "signed_request_object.required: JWT Authorization Requests (JAR) are not required for this confidential client.",
  },
  "clients_require_pushed_authorization_requests": {
    level: "recommended",
    description:
      "require_pushed_authorization_requests: Pushed Authorization Requests (PAR) are not required for this confidential client.",
  },
  "clients_client_authentication_methods.private_key_jwt": {
    level: "recommended",
    description:
      "client_authentication_methods.private_key_jwt: Private key JWT client authentication is not configured. Consider it over shared client secrets.",
  },
};

function mapCheckResult(
  result: CheckmateCheckResult,
  tenantTag: TenantTag,
  clients: Management.Client[]
): Finding[] {
  const findings: Finding[] = [];

  for (const clientReport of result.details) {
    for (const report of clientReport.report) {
      if (report.status !== "red") {
        // Do not report successes
        continue;
      }

      const clientName = report.client_id
        ? report.name.replace(` (${report.client_id})`, "").trim()
        : report.name;

      const client = clients.find((client) => client.client_id === report.client_id);
      assert(client, "Client not found");

      const value = report.value !== undefined ? String(report.value) : undefined;
      const code = "clients_" + report.field;
      const extra = { clientId: report.client_id, value };

      switch (report.field) {
        case "insecure_callbacks":
          if (tenantTag === "dev") break;
          findings.push(
            buildFinding(
              DEFINITIONS,
              code,
              clientName,
              `callbacks: Insecure pattern in callback URL: ${value}`,
              extra
            )
          );
          break;

        case "insecure_allowed_logout_urls":
          if (tenantTag === "dev") break;
          findings.push(
            buildFinding(
              DEFINITIONS,
              code,
              clientName,
              `allowed_logout_urls: Insecure pattern in logout URL: ${value}`,
              extra
            )
          );
          break;

        case "use_rotating_refresh_token":
          findings.push(
            buildFinding(
              DEFINITIONS,
              code,
              clientName,
              `refresh_token.rotation_type: Refresh token rotation is "${value}". Rotating refresh tokens should be used.`,
              extra
            )
          );
          break;

        case "insecure_web_origins_urls":
          if (tenantTag === "dev") break;
          findings.push(
            buildFinding(
              DEFINITIONS,
              code,
              clientName,
              `web_origins: Insecure pattern in web origin: ${value}`,
              extra
            )
          );
          break;

        case "insecure_initiate_login_uri":
          if (tenantTag === "dev") break;
          findings.push(
            buildFinding(
              DEFINITIONS,
              code,
              clientName,
              `initiate_login_uri: Insecure pattern in initiate_login_uri: ${value}`,
              extra
            )
          );
          break;

        case "unexpected_grant_type_for_app_type":
          findings.push(
            buildFinding(
              DEFINITIONS,
              code,
              clientName,
              `grant_types: Unexpected grant types for ${report.app_type ?? "unknown"} application: ${value}`,
              extra
            )
          );
          break;

        case "signed_request_object.credentials":
          findings.push(
            buildFinding(
              DEFINITIONS,
              code,
              clientName,
              "signed_request_object.credentials: JAR is required but no signing credentials are configured.",
              extra
            )
          );
          break;

        case "cross_origin_authentication_enabled":
          findings.push(
            buildFinding(
              DEFINITIONS,
              code,
              clientName,
              "cross_origin_authentication: Cross-origin authentication is enabled. This feature has been deprecated by Auth0.",
              extra
            )
          );
          break;

        case "not_using_asymmetric_alg":
          findings.push(
            buildFinding(
              DEFINITIONS,
              code,
              clientName,
              "jwt_configuration.alg: ID tokens are signed with HS256, a symmetric algorithm. Use RS256 or another asymmetric algorithm.",
              extra
            )
          );
          break;

        case "require_proof_of_possession":
          // TOOD: Investigate this to fiogure out what apps would require this
          // findings.push(buildFinding(DEFINITIONS, code, clientName, "require_proof_of_possession: mTLS token sender-constraining (proof of possession) is not required.", extra));
          break;

        case "missing_initiate_login_uri":
          findings.push(
            buildFinding(
              DEFINITIONS,
              code,
              clientName,
              "initiate_login_uri: No initiate_login_uri configured. Third-party initiated login will not work.",
              extra
            )
          );
          break;

        case "oidc_backchannel_logout.backchannel_logout_urls":
          findings.push(
            buildFinding(
              DEFINITIONS,
              code,
              clientName,
              "oidc_logout.backchannel_logout_urls: Back-channel logout is not configured for this server-side web application.",
              extra
            )
          );
          break;

        case "signed_request_object.required":
          findings.push(
            buildFinding(
              DEFINITIONS,
              code,
              clientName,
              "signed_request_object.required: JWT Authorization Requests (JAR) are not required for this confidential client.",
              extra
            )
          );
          break;

        case "require_pushed_authorization_requests":
          findings.push(
            buildFinding(
              DEFINITIONS,
              code,
              clientName,
              "require_pushed_authorization_requests: Pushed Authorization Requests (PAR) are not required for this confidential client.",
              extra
            )
          );
          break;

        case "client_authentication_methods.private_key_jwt":
          if (["Actions Connector", "Forms Connector"].includes(client.name!)) {
            break;
          }
          findings.push(
            buildFinding(
              DEFINITIONS,
              code,
              clientName,
              "client_authentication_methods.private_key_jwt: Private key JWT client authentication is not configured. Consider it over shared client secrets.",
              extra
            )
          );
          break;

        default:
          throw new Error(`Unknown check: ${report.field}`);
      }
    }
  }

  return findings;
}

export async function validateClients(
  clients: Management.Client[],
  tenantTag?: TenantTag
): Promise<Finding[]> {
  const nonGlobalClients = clients.filter((c) => !c.global);

  const results = await Promise.all([
    checkAllowedCallbacks({ clients: nonGlobalClients }),
    checkAllowedLogoutUrl({ clients: nonGlobalClients }),
    checkAppTokenSenderConstraining({ clients: nonGlobalClients }),
    checkApplicationLoginUri({ clients: nonGlobalClients }),
    checkBackchannelLogout({ clients: nonGlobalClients }),
    checkCrossOriginAuthentication({ clients: nonGlobalClients }),
    checkGrantTypes({ clients: nonGlobalClients }),
    checkJAR({ clients: nonGlobalClients }),
    checkJWTSignAlg({ clients: nonGlobalClients }),
    checkPAR({ clients: nonGlobalClients }),
    checkPrivateKeyJWT({ clients: nonGlobalClients }),
    checkRefreshToken({ clients: nonGlobalClients }),
    checkWebOrigins({ clients: nonGlobalClients }),
  ]);

  return results.flatMap((result) =>
    mapCheckResult(result, tenantTag || "prod", clients)
  );
}
