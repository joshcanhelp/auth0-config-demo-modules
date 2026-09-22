import process from "node:process";

import { deploy } from "auth0-deploy-cli";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getClientCredentialsToken } from "../../auth0/clientCredentials.js";
import { createFileCache } from "../../scripts/utils/fileCache.js";
import { deployCliPush } from "./push-deploy.js";

vi.mock("auth0-deploy-cli", () => ({ deploy: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../auth0/clientCredentials.js", () => ({
  getClientCredentialsToken: vi.fn(),
}));
vi.mock("../../scripts/utils/fileCache.js", () => ({
  createFileCache: vi.fn().mockReturnValue({}),
}));

const mockDeploy = vi.mocked(deploy);
const mockGetToken = vi.mocked(getClientCredentialsToken);
const mockCreateFileCache = vi.mocked(createFileCache);

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
});
