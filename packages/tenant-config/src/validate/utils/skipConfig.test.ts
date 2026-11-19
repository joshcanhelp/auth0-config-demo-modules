import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isFindingSkipped, loadSkipConfig, type SkipConfig } from "./skipConfig.js";
import type { Finding } from "./types.js";

vi.mock("../../tenantConfigFile.js", () => ({
  loadTenantConfigFile: vi.fn(),
  TENANT_CONFIG_FILENAME: ".auth0vant.json",
}));

const { loadTenantConfigFile } = await import("../../tenantConfigFile.js");
const mockLoadTenantConfigFile = vi.mocked(loadTenantConfigFile);

const EMPTY_SKIP_CONFIG: SkipConfig = {
  skipCodes: [],
  skipInstances: {},
  skipHardcodedValues: [],
  skipHardcodedVariable: [],
};

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    code: "email_template_not_configured",
    level: "recommended",
    entityName: "Verification Code for Email MFA",
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
  it("returns an empty config when there's no validate key at all", () => {
    mockLoadTenantConfigFile.mockReturnValue({});
    expect(loadSkipConfig("./tenants/example", "./tenants")).toEqual(EMPTY_SKIP_CONFIG);
  });

  it("reads every key from the merged config's validate key", () => {
    mockLoadTenantConfigFile.mockReturnValue({
      validate: {
        skipCodes: ["tenant_settings_no_support_url"],
        skipInstances: {
          email_template_not_configured: ["Verification Code for Email MFA"],
        },
        skipHardcodedValues: ["https://example.com"],
        skipHardcodedVariable: ["apiKey"],
      },
    });

    expect(loadSkipConfig("./tenants/example", "./tenants")).toEqual({
      skipCodes: ["tenant_settings_no_support_url"],
      skipInstances: {
        email_template_not_configured: ["Verification Code for Email MFA"],
      },
      skipHardcodedValues: ["https://example.com"],
      skipHardcodedVariable: ["apiKey"],
    });
  });

  it("defaults missing keys within validate to empty", () => {
    mockLoadTenantConfigFile.mockReturnValue({ validate: {} });
    expect(loadSkipConfig("./tenants/example", "./tenants")).toEqual(EMPTY_SKIP_CONFIG);
  });

  it("warns and returns an empty config when validate isn't an object", () => {
    mockLoadTenantConfigFile.mockReturnValue({ validate: "oops" });

    expect(loadSkipConfig("./tenants/example", "./tenants")).toEqual(EMPTY_SKIP_CONFIG);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("must be an object")
    );
  });

  it("warns on an unrecognized code but still returns the config", () => {
    mockLoadTenantConfigFile.mockReturnValue({
      validate: { skipCodes: ["not_a_real_code"] },
    });

    expect(loadSkipConfig("./tenants/example", "./tenants")).toEqual({
      ...EMPTY_SKIP_CONFIG,
      skipCodes: ["not_a_real_code"],
    });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("not_a_real_code"));
  });

  it("warns on an unrecognized key within validate, e.g. nesting by entity instead of using skipInstances", () => {
    mockLoadTenantConfigFile.mockReturnValue({
      validate: {
        email_templates: { email_template_not_configured: ["Welcome Email"] },
      },
    });

    expect(loadSkipConfig("./tenants/example", "./tenants")).toEqual(EMPTY_SKIP_CONFIG);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("email_templates"));
  });

  it("does not warn about skipHardcodedValues/skipHardcodedVariable as unrecognized keys", () => {
    mockLoadTenantConfigFile.mockReturnValue({
      validate: {
        skipHardcodedValues: ["a"],
        skipHardcodedVariable: ["b"],
      },
    });

    loadSkipConfig("./tenants/example", "./tenants");
    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe("isFindingSkipped", () => {
  it("skips a finding whose code is in skipCodes", () => {
    const finding = makeFinding({ code: "tenant_settings_no_support_url" });
    const skipConfig = {
      ...EMPTY_SKIP_CONFIG,
      skipCodes: ["tenant_settings_no_support_url"],
    };
    expect(isFindingSkipped(finding, skipConfig)).toBe(true);
  });

  it("does not skip an unrelated code", () => {
    const finding = makeFinding({ code: "tenant_settings_no_support_url" });
    const skipConfig = { ...EMPTY_SKIP_CONFIG, skipCodes: ["some_other_code"] };
    expect(isFindingSkipped(finding, skipConfig)).toBe(false);
  });

  it("skips a finding matching an instance by entityName", () => {
    const finding = makeFinding({ entityName: "Verification Code for Email MFA" });
    const skipConfig = {
      ...EMPTY_SKIP_CONFIG,
      skipInstances: {
        email_template_not_configured: ["Verification Code for Email MFA"],
      },
    };
    expect(isFindingSkipped(finding, skipConfig)).toBe(true);
  });

  it("skips a finding matching an instance by entityId", () => {
    const finding = makeFinding({
      code: "clients_unexpected_fields_for_app_type",
      entityName: "Actions Connector",
      entityId: "abc123",
    });
    const skipConfig = {
      ...EMPTY_SKIP_CONFIG,
      skipInstances: { clients_unexpected_fields_for_app_type: ["abc123"] },
    };
    expect(isFindingSkipped(finding, skipConfig)).toBe(true);
  });

  it("does not skip other instances of the same code", () => {
    const finding = makeFinding({ entityName: "Welcome Email" });
    const skipConfig = {
      ...EMPTY_SKIP_CONFIG,
      skipInstances: {
        email_template_not_configured: ["Verification Code for Email MFA"],
      },
    };
    expect(isFindingSkipped(finding, skipConfig)).toBe(false);
  });

  it("skips an actions hardcoded-value finding whose value matches skipHardcodedValues", () => {
    const finding = makeFinding({
      code: "actions_hard_coded_value_detected",
      value: "https://example.com",
      field: "apiBaseUrl",
    });
    const skipConfig = {
      ...EMPTY_SKIP_CONFIG,
      skipHardcodedValues: ["https://example.com"],
    };
    expect(isFindingSkipped(finding, skipConfig)).toBe(true);
  });

  it("skips an actions hardcoded-value finding whose variable name matches skipHardcodedVariable", () => {
    const finding = makeFinding({
      code: "actions_hard_coded_value_detected",
      field: "apiKey",
    });
    const skipConfig = { ...EMPTY_SKIP_CONFIG, skipHardcodedVariable: ["apiKey"] };
    expect(isFindingSkipped(finding, skipConfig)).toBe(true);
  });

  it("skips a databases hardcoded-value finding whose variable name matches skipHardcodedVariable", () => {
    const finding = makeFinding({
      code: "databases_hard_coded_value_detected",
      field: "apiKey",
    });
    const skipConfig = { ...EMPTY_SKIP_CONFIG, skipHardcodedVariable: ["apiKey"] };
    expect(isFindingSkipped(finding, skipConfig)).toBe(true);
  });

  it("does not skip a hardcoded-value finding whose value/variable aren't listed", () => {
    const finding = makeFinding({
      code: "actions_hard_coded_value_detected",
      value: "https://example.com",
      field: "apiBaseUrl",
    });
    const skipConfig = {
      ...EMPTY_SKIP_CONFIG,
      skipHardcodedValues: ["something-else"],
      skipHardcodedVariable: ["something-else"],
    };
    expect(isFindingSkipped(finding, skipConfig)).toBe(false);
  });

  it("does not apply skipHardcodedValues/skipHardcodedVariable to an unrelated code", () => {
    const finding = makeFinding({
      code: "clients_unexpected_fields_for_app_type",
      value: "https://example.com",
      field: "apiKey",
    });
    const skipConfig = {
      ...EMPTY_SKIP_CONFIG,
      skipHardcodedValues: ["https://example.com"],
      skipHardcodedVariable: ["apiKey"],
    };
    expect(isFindingSkipped(finding, skipConfig)).toBe(false);
  });
});
