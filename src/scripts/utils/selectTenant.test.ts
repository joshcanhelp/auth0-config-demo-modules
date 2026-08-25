import process from "node:process";
import { readdirSync } from "node:fs";

import dotenv from "dotenv";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { confirmPrompt, selectPrompt } from "./selectPrompt.js";
import { selectTenant } from "./selectTenant.js";

vi.mock("node:fs", () => ({ readdirSync: vi.fn() }));
vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));
vi.mock("./selectPrompt.js", () => ({
  selectPrompt: vi.fn(),
  confirmPrompt: vi.fn(),
}));

const mockReaddirSync = vi.mocked(readdirSync);
const mockSelectPrompt = vi.mocked(selectPrompt);
const mockConfirmPrompt = vi.mocked(confirmPrompt);
const mockDotenvConfig = vi.mocked(dotenv.config);

const mockDirents = [
  { name: "tenant-a-PUSH", isDirectory: () => true },
  { name: "tenant-b-PULL", isDirectory: () => true },
  { name: ".hidden", isDirectory: () => true },
  { name: "readme.txt", isDirectory: () => false },
];

const originalArgv = process.argv;

beforeEach(() => {
  vi.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process.exit called");
  });
  process.argv = ["node", "script.ts"];
  mockReaddirSync.mockReturnValue(mockDirents as never);
  mockSelectPrompt.mockResolvedValue("tenant-a-PUSH");
  mockConfirmPrompt.mockResolvedValue(true);
  mockDotenvConfig.mockReturnValue({});
  delete process.env.TENANT_DOMAIN;
  delete process.env.TENANT_TYPE;
});

afterEach(() => {
  vi.restoreAllMocks();
  process.argv = originalArgv;
  delete process.env.TENANT_DOMAIN;
  delete process.env.TENANT_TYPE;
});

describe("selectTenant", () => {
  describe("interactive mode", () => {
    it("returns correct paths for the selected tenant", async () => {
      const result = await selectTenant();
      expect(result).toEqual({
        tenantDir: "./tenants/tenant-a-PUSH",
        envFile: "./tenants/tenant-a-PUSH/.env",
        tenantType: "PUSH",
      });
    });

    it("returns PULL tenantType for a -PULL directory", async () => {
      mockSelectPrompt.mockResolvedValue("tenant-b-PULL");
      const result = await selectTenant();
      expect(result.tenantType).toBe("PULL");
    });

    it("returns tenantType from TENANT_TYPE env var when set", async () => {
      process.env.TENANT_TYPE = "PULL";
      const result = await selectTenant();
      expect(result.tenantType).toBe("PULL");
    });

    it("TENANT_TYPE env var overrides directory suffix", async () => {
      process.env.TENANT_TYPE = "PUSH";
      mockSelectPrompt.mockResolvedValue("tenant-b-PULL");
      const result = await selectTenant();
      expect(result.tenantType).toBe("PUSH");
    });

    it("filters hidden directories and files from tenant options", async () => {
      await selectTenant();
      expect(mockSelectPrompt).toHaveBeenCalledWith("Select a tenant:", [
        { label: "tenant-a-PUSH", value: "tenant-a-PUSH" },
        { label: "tenant-b-PULL", value: "tenant-b-PULL" },
      ]);
    });

    it("loads dotenv from the selected tenant's .env file", async () => {
      await selectTenant();
      expect(mockDotenvConfig).toHaveBeenCalledWith({
        path: "./tenants/tenant-a-PUSH/.env",
      });
    });

    it("shows TENANT_DOMAIN in confirmation", async () => {
      process.env.TENANT_DOMAIN = "my-tenant.auth0.com";
      await selectTenant();
      expect(mockConfirmPrompt).toHaveBeenCalledWith(
        expect.stringContaining("my-tenant.auth0.com")
      );
    });

    it("shows fallback text when no domain is configured", async () => {
      await selectTenant();
      expect(mockConfirmPrompt).toHaveBeenCalledWith(
        expect.stringContaining("no domain configured")
      );
    });

    it("exits cleanly when user declines confirmation", async () => {
      mockConfirmPrompt.mockResolvedValue(false);
      await expect(selectTenant()).rejects.toThrow("process.exit called");
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it("exits with error when no tenants are found", async () => {
      mockReaddirSync.mockReturnValue([]);
      await expect(selectTenant()).rejects.toThrow("process.exit called");
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("--tenant flag", () => {
    it("matches a directory by stripping -PUSH suffix", async () => {
      process.argv = ["node", "script.ts", "--tenant", "tenant-a"];
      const result = await selectTenant();
      expect(result).toEqual({
        tenantDir: "./tenants/tenant-a-PUSH",
        envFile: "./tenants/tenant-a-PUSH/.env",
        tenantType: "PUSH",
      });
    });

    it("matches a directory by stripping -PULL suffix", async () => {
      process.argv = ["node", "script.ts", "--tenant", "tenant-b"];
      const result = await selectTenant();
      expect(result.tenantDir).toBe("./tenants/tenant-b-PULL");
    });

    it("supports --tenant=name syntax", async () => {
      process.argv = ["node", "script.ts", "--tenant=tenant-a"];
      const result = await selectTenant();
      expect(result.tenantDir).toBe("./tenants/tenant-a-PUSH");
    });

    it("skips the selection prompt", async () => {
      process.argv = ["node", "script.ts", "--tenant", "tenant-a"];
      await selectTenant();
      expect(mockSelectPrompt).not.toHaveBeenCalled();
    });

    it("skips the confirmation prompt", async () => {
      process.argv = ["node", "script.ts", "--tenant", "tenant-a"];
      await selectTenant();
      expect(mockConfirmPrompt).not.toHaveBeenCalled();
    });

    it("still loads dotenv", async () => {
      process.argv = ["node", "script.ts", "--tenant", "tenant-a"];
      await selectTenant();
      expect(mockDotenvConfig).toHaveBeenCalledWith({
        path: "./tenants/tenant-a-PUSH/.env",
      });
    });

    it("exits with error when no directory matches the flag", async () => {
      process.argv = ["node", "script.ts", "--tenant", "unknown"];
      await expect(selectTenant()).rejects.toThrow("process.exit called");
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
