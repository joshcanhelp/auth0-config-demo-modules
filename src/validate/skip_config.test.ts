import { existsSync, readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isFindingSkipped, loadSkipConfig } from "./skip_config.js";
import type { Finding } from "./types.js";

vi.mock("node:fs", () => ({ existsSync: vi.fn(), readFileSync: vi.fn() }));

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    code: "email_template_not_configured",
    level: "recommended",
    clientName: "Verification Code for Email MFA",
    message: "not configured",
    ...overrides,
  };
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadSkipConfig", () => {
  it("returns an empty config when the file does not exist", () => {
    mockExistsSync.mockReturnValue(false);
    expect(loadSkipConfig("./tenants/example")).toEqual({
      skipCodes: [],
      skipInstances: {},
    });
  });

  it("returns an empty config when the file is empty", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("   ");
    expect(loadSkipConfig("./tenants/example")).toEqual({
      skipCodes: [],
      skipInstances: {},
    });
  });

  it("parses skipCodes and skipInstances from valid JSON", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        skipCodes: ["tenant_settings_no_support_url"],
        skipInstances: {
          email_template_not_configured: ["Verification Code for Email MFA"],
        },
      })
    );

    expect(loadSkipConfig("./tenants/example")).toEqual({
      skipCodes: ["tenant_settings_no_support_url"],
      skipInstances: {
        email_template_not_configured: ["Verification Code for Email MFA"],
      },
    });
  });

  it("defaults missing keys to empty", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("{}");
    expect(loadSkipConfig("./tenants/example")).toEqual({
      skipCodes: [],
      skipInstances: {},
    });
  });

  it("warns and returns an empty config on invalid JSON", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("not json");

    expect(loadSkipConfig("./tenants/example")).toEqual({
      skipCodes: [],
      skipInstances: {},
    });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("not valid JSON"));
  });

  it("warns on an unrecognized code but still returns the config", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ skipCodes: ["not_a_real_code"] }));

    expect(loadSkipConfig("./tenants/example")).toEqual({
      skipCodes: ["not_a_real_code"],
      skipInstances: {},
    });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("not_a_real_code"));
  });

  it("warns on an unrecognized top-level key, e.g. nesting by entity instead of using skipInstances", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        email_templates: { email_template_not_configured: ["Welcome Email"] },
      })
    );

    expect(loadSkipConfig("./tenants/example")).toEqual({
      skipCodes: [],
      skipInstances: {},
    });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("email_templates"));
  });
});

describe("isFindingSkipped", () => {
  it("skips a finding whose code is in skipCodes", () => {
    const finding = makeFinding({ code: "tenant_settings_no_support_url" });
    const skipConfig = {
      skipCodes: ["tenant_settings_no_support_url"],
      skipInstances: {},
    };
    expect(isFindingSkipped(finding, skipConfig)).toBe(true);
  });

  it("does not skip an unrelated code", () => {
    const finding = makeFinding({ code: "tenant_settings_no_support_url" });
    const skipConfig = { skipCodes: ["some_other_code"], skipInstances: {} };
    expect(isFindingSkipped(finding, skipConfig)).toBe(false);
  });

  it("skips a finding matching an instance by clientName", () => {
    const finding = makeFinding({ clientName: "Verification Code for Email MFA" });
    const skipConfig = {
      skipCodes: [],
      skipInstances: {
        email_template_not_configured: ["Verification Code for Email MFA"],
      },
    };
    expect(isFindingSkipped(finding, skipConfig)).toBe(true);
  });

  it("skips a finding matching an instance by clientId", () => {
    const finding = makeFinding({
      code: "clients_unexpected_fields_for_app_type",
      clientName: "Actions Connector",
      clientId: "abc123",
    });
    const skipConfig = {
      skipCodes: [],
      skipInstances: { clients_unexpected_fields_for_app_type: ["abc123"] },
    };
    expect(isFindingSkipped(finding, skipConfig)).toBe(true);
  });

  it("does not skip other instances of the same code", () => {
    const finding = makeFinding({ clientName: "Welcome Email" });
    const skipConfig = {
      skipCodes: [],
      skipInstances: {
        email_template_not_configured: ["Verification Code for Email MFA"],
      },
    };
    expect(isFindingSkipped(finding, skipConfig)).toBe(false);
  });
});
