import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadDeployConfig } from "./deployConfig.js";

let tenantDir: string;

afterEach(() => {
  if (tenantDir) rmSync(tenantDir, { recursive: true, force: true });
});

describe("loadDeployConfig", () => {
  it("returns empty defaults when the file does not exist", () => {
    tenantDir = mkdtempSync(join(tmpdir(), "deploy-config-"));

    expect(loadDeployConfig(tenantDir)).toEqual({
      skipEntities: [],
      keywordReplaceMappings: [],
    });
  });

  it("reads skipEntities and keywordReplaceMappings from the file", () => {
    tenantDir = mkdtempSync(join(tmpdir(), "deploy-config-"));
    writeFileSync(
      join(tenantDir, ".deploy-config.json"),
      JSON.stringify({
        skipEntities: ["hooks"],
        keywordReplaceMappings: ["C360_BASE_URL"],
      })
    );

    expect(loadDeployConfig(tenantDir)).toEqual({
      skipEntities: ["hooks"],
      keywordReplaceMappings: ["C360_BASE_URL"],
    });
  });

  it("defaults missing or non-array properties to empty arrays", () => {
    tenantDir = mkdtempSync(join(tmpdir(), "deploy-config-"));
    writeFileSync(
      join(tenantDir, ".deploy-config.json"),
      JSON.stringify({ keywordReplaceMappings: "not-an-array" })
    );

    expect(loadDeployConfig(tenantDir)).toEqual({
      skipEntities: [],
      keywordReplaceMappings: [],
    });
  });
});
