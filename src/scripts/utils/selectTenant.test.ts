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
  { name: "tenant-a", isDirectory: () => true },
  { name: "tenant-b", isDirectory: () => true },
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
  mockSelectPrompt.mockResolvedValue("tenant-a");
  mockConfirmPrompt.mockResolvedValue(true);
  mockDotenvConfig.mockReturnValue({});
  process.env.TENANT_TYPE = "PUSH";
  delete process.env.TENANT_DOMAIN;
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
        tenantDir: "./tenants/tenant-a",
        envFile: "./tenants/tenant-a/.env",
        tenantType: "PUSH",
      });
    });

    it("returns tenantType from TENANT_TYPE env var", async () => {
      process.env.TENANT_TYPE = "PULL";
      const result = await selectTenant();
      expect(result.tenantType).toBe("PULL");
    });

    it("exits with error when TENANT_TYPE is missing", async () => {
      delete process.env.TENANT_TYPE;
      await expect(selectTenant()).rejects.toThrow("process.exit called");
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("exits with error when TENANT_TYPE is invalid", async () => {
      process.env.TENANT_TYPE = "bogus";
      await expect(selectTenant()).rejects.toThrow("process.exit called");
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("filters hidden directories and files from tenant options", async () => {
      await selectTenant();
      expect(mockSelectPrompt).toHaveBeenCalledWith("Select a tenant:", [
        { label: "tenant-a", value: "tenant-a" },
        { label: "tenant-b", value: "tenant-b" },
      ]);
    });

    it("loads dotenv from the selected tenant's .env file", async () => {
      await selectTenant();
      expect(mockDotenvConfig).toHaveBeenCalledWith({
        path: "./tenants/tenant-a/.env",
        quiet: true,
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
    it("matches a directory by exact name", async () => {
      process.argv = ["node", "script.ts", "--tenant", "tenant-a"];
      const result = await selectTenant();
      expect(result).toEqual({
        tenantDir: "./tenants/tenant-a",
        envFile: "./tenants/tenant-a/.env",
        tenantType: "PUSH",
      });
    });

    it("supports --tenant=name syntax", async () => {
      process.argv = ["node", "script.ts", "--tenant=tenant-a"];
      const result = await selectTenant();
      expect(result.tenantDir).toBe("./tenants/tenant-a");
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
        path: "./tenants/tenant-a/.env",
        quiet: true,
      });
    });

    it("exits with error when no directory matches the flag", async () => {
      process.argv = ["node", "script.ts", "--tenant", "unknown"];
      await expect(selectTenant()).rejects.toThrow("process.exit called");
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
