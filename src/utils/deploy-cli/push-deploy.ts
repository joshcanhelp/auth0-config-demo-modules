import { deploy } from "auth0-deploy-cli";
import { AssetTypes } from "auth0-deploy-cli/lib/types.js";

import { getClientCredentialsToken } from "../../auth0/clientCredentials.js";
import { withRetryOnInsufficientScope } from "../../auth0/withRetryOnInsufficientScope.js";
import { createFileCache } from "../../scripts/utils/fileCache.js";


export const deployCliPush = async ({
  tenantDir,
  assetType
}: {
  tenantDir: string
  assetType: AssetTypes | AssetTypes[]
}) => {

  const { TENANT_DOMAIN, M2M_CLIENT_ID, M2M_CLIENT_SECRET, AUTH0_TO_AUTH0_CLIENT_ID = "", AUTH0_TO_AUTH0_CLIENT_SECRET = "" } = process.env;
  
  if (!TENANT_DOMAIN || !M2M_CLIENT_ID || !M2M_CLIENT_SECRET) {
    console.error("Missing required environment variables. Please check your .env file.");
    process.exit(1);
  }

  const cache = createFileCache(`${tenantDir}/.management-token.json`);
  await withRetryOnInsufficientScope(
    () =>
      getClientCredentialsToken(TENANT_DOMAIN, M2M_CLIENT_ID, M2M_CLIENT_SECRET, {
        cache,
      }),
    () => cache.clear(),
    (token) =>
      deploy({
        input_file: tenantDir,
        config: {
          AUTH0_DOMAIN: TENANT_DOMAIN,
          AUTH0_ACCESS_TOKEN: token,
          AUTH0_INCLUDED_ONLY: Array.isArray(assetType) ? assetType : [assetType],
          AUTH0_KEYWORD_REPLACE_MAPPINGS: {
            TENANT_DOMAIN,
            AUTH0_TO_AUTH0_CLIENT_ID,
            AUTH0_TO_AUTH0_CLIENT_SECRET
          },
        },
      })
  );
}