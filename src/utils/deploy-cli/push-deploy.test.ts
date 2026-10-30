import process from "node:process";

import { deploy } from "auth0-deploy-cli";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getClientCredentialsToken } from "../../auth0/clientCredentials.js";
import { createFileCache } from "../../scripts/utils/fileCache.js";
import { loadDeployConfig } from "../../scripts/utils/deployConfig.js";
import { deployCliPush } from "./push-deploy.js";

vi.mock("auth0-deploy-cli", () => ({ deploy: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../auth0/clientCredentials.js", () => ({
  getClientCredentialsToken: vi.fn(),
}));
vi.mock("../../scripts/utils/fileCache.js", () => ({
  createFileCache: vi.fn().mockReturnValue({}),
}));
vi.mock("../../scripts/utils/deployConfig.js", () => ({
  loadDeployConfig: vi
    .fn()
    .mockReturnValue({ skipEntities: [], keywordReplaceMappings: [] }),
}));

const mockDeploy = vi.mocked(deploy);
const mockGetToken = vi.mocked(getClientCredentialsToken);
const mockCreateFileCache = vi.mocked(createFileCache);
const mockLoadDeployConfig = vi.mocked(loadDeployConfig);

function tokenWithScopes(scope: string): string {
  const payload = Buffer.from(JSON.stringify({ scope })).toString("base64url");
  return `header.${payload}.signature`;
}

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process.exit called");
  });
  process.env.TENANT_DOMAIN = "my-tenant.auth0.com";
  process.env.M2M_CLIENT_ID = "client-id";
  process.env.M2M_CLIENT_SECRET = "client-secret";
  mockCreateFileCache.mockReturnValue({} as never);
  mockLoadDeployConfig.mockReturnValue({ skipEntities: [], keywordReplaceMappings: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

describe("deployCliPush", () => {
  it("deploys when tenantType is PUSH, regardless of token scopes", async () => {
    mockGetToken.mockResolvedValue(tokenWithScopes("create:clients update:clients"));

    await deployCliPush({
      tenantDir: "./tenants/my-tenant",
      assetType: "clients",
      tenantType: "PUSH",
    });

    expect(mockDeploy).toHaveBeenCalledOnce();
  });

  it("deploys when tenantType is PULL and the token only has read scopes", async () => {
    mockGetToken.mockResolvedValue(tokenWithScopes("read:clients read:grants"));

    await deployCliPush({
      tenantDir: "./tenants/my-tenant",
      assetType: "clients",
      tenantType: "PULL",
    });

    expect(mockDeploy).toHaveBeenCalledOnce();
  });

  it("refuses to deploy when tenantType is PULL and the token has a write scope", async () => {
    mockGetToken.mockResolvedValue(tokenWithScopes("read:clients update:clients"));

    await expect(
      deployCliPush({
        tenantDir: "./tenants/my-tenant",
        assetType: "clients",
        tenantType: "PULL",
      })
    ).rejects.toThrow("process.exit called");

    expect(process.exit).toHaveBeenCalledWith(1);
    expect(mockDeploy).not.toHaveBeenCalled();
  });

  it("merges env vars listed in keywordReplaceMappings into AUTH0_KEYWORD_REPLACE_MAPPINGS", async () => {
    mockGetToken.mockResolvedValue(tokenWithScopes("create:clients update:clients"));
    mockLoadDeployConfig.mockReturnValue({
      skipEntities: [],
      keywordReplaceMappings: ["C360_BASE_URL"],
    });
    process.env.C360_BASE_URL = "https://example.test";

    await deployCliPush({
      tenantDir: "./tenants/my-tenant",
      assetType: "clients",
      tenantType: "PUSH",
    });

    expect(mockDeploy).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          AUTH0_KEYWORD_REPLACE_MAPPINGS: expect.objectContaining({
            C360_BASE_URL: "https://example.test",
          }),
        }),
      })
    );
  });

  it("refuses to deploy when a keywordReplaceMappings var is missing from the environment", async () => {
    mockGetToken.mockResolvedValue(tokenWithScopes("create:clients update:clients"));
    mockLoadDeployConfig.mockReturnValue({
      skipEntities: [],
      keywordReplaceMappings: ["MISSING_VAR"],
    });

    await expect(
      deployCliPush({
        tenantDir: "./tenants/my-tenant",
        assetType: "clients",
        tenantType: "PUSH",
      })
    ).rejects.toThrow(/MISSING_VAR/);

    expect(mockDeploy).not.toHaveBeenCalled();
  });
});
