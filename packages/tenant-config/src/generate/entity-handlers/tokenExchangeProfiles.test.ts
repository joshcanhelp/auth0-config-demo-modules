import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PromptSession } from "auth0-config-demo-modules/packages/core/src/index.js";
import {
  deriveProfileName,
  handleTokenExchangeProfile,
} from "./tokenExchangeProfiles.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockMkdirSync = vi.mocked(mkdirSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockReaddirSync = vi.mocked(readdirSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

function fakePrompts(): PromptSession {
  return {
    text: vi.fn().mockResolvedValue(""),
    select: vi.fn().mockResolvedValue("Validate Testing Token"),
  } as unknown as PromptSession;
}

const template = {
  type: "custom_authentication",
  subject_token_type: "https://testing",
};

const customTokenExchangeAction = {
  name: "Validate Testing Token",
  supported_triggers: [{ id: "custom-token-exchange", version: "v1" }],
};

const postLoginAction = {
  name: "Add Custom Claims",
  supported_triggers: [{ id: "post-login", version: "v3" }],
};

describe("deriveProfileName", () => {
  it("returns the folder name after the type prefix", () => {
    const name = deriveProfileName("/templates/Token Exchange > Testing");
    expect(name).toBe("Testing");
  });

  it("rejoins any additional ' > ' segments", () => {
    const name = deriveProfileName("/templates/Token Exchange > Partner > CIS");
    expect(name).toBe("Partner > CIS");
  });
});

describe("handleTokenExchangeProfile", () => {
  beforeEach(() => {
    mockExistsSync.mockImplementation(
      (path) =>
        typeof path === "string" &&
        (path.endsWith("profile.json") || path.endsWith("actions"))
    );
    mockReaddirSync.mockReturnValue(["action.json"] as unknown as ReturnType<
      typeof readdirSync
    >);
    mockReadFileSync.mockImplementation((path) => {
      if (typeof path === "string" && path.endsWith("action.json")) {
        return JSON.stringify(customTokenExchangeAction);
      }
      return JSON.stringify(template);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads profile.json from the template directory", async () => {
    await handleTokenExchangeProfile(
      "/templates/Token Exchange > Testing",
      "/tenants/demo",
      fakePrompts()
    );
    expect(mockReadFileSync).toHaveBeenCalledWith(
      "/templates/Token Exchange > Testing/profile.json",
      "utf-8"
    );
  });

  it("defaults the name to the template folder name when no input given", async () => {
    await handleTokenExchangeProfile(
      "/templates/Token Exchange > Testing",
      "/tenants/demo",
      fakePrompts()
    );
    const [outputPath, contents] = mockWriteFileSync.mock.calls[0]!;
    expect(outputPath).toBe("/tenants/demo/token-exchange-profiles/Testing.json");
    expect(JSON.parse(contents as string).name).toBe("Testing");
  });

  it("uses the provided name over the folder default", async () => {
    const prompts = fakePrompts();
    vi.mocked(prompts.text).mockResolvedValueOnce("My Custom Profile");
    await handleTokenExchangeProfile(
      "/templates/Token Exchange > Testing",
      "/tenants/demo",
      prompts
    );
    const [outputPath, contents] = mockWriteFileSync.mock.calls[0]!;
    expect(outputPath).toBe(
      "/tenants/demo/token-exchange-profiles/My Custom Profile.json"
    );
    expect(JSON.parse(contents as string).name).toBe("My Custom Profile");
  });

  it("only offers actions that support the custom-token-exchange trigger", async () => {
    mockReaddirSync.mockReturnValue([
      "action1.json",
      "action2.json",
    ] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockImplementation((path) => {
      if (typeof path === "string" && path.endsWith("action1.json")) {
        return JSON.stringify(customTokenExchangeAction);
      }
      if (typeof path === "string" && path.endsWith("action2.json")) {
        return JSON.stringify(postLoginAction);
      }
      return JSON.stringify(template);
    });
    const prompts = fakePrompts();

    await handleTokenExchangeProfile(
      "/templates/Token Exchange > Testing",
      "/tenants/demo",
      prompts
    );

    expect(prompts.select).toHaveBeenCalledWith(
      "Select the custom token exchange action:",
      [{ label: "Validate Testing Token", value: "Validate Testing Token" }]
    );
  });

  it("writes the selected action and subject_token_type to the output file", async () => {
    const prompts = fakePrompts();
    vi.mocked(prompts.text)
      .mockResolvedValueOnce("") // name
      .mockResolvedValueOnce("https://custom-issuer"); // subject_token_type

    await handleTokenExchangeProfile(
      "/templates/Token Exchange > Testing",
      "/tenants/demo",
      prompts
    );

    const [, contents] = mockWriteFileSync.mock.calls[0]!;
    const output = JSON.parse(contents as string);
    expect(output.action).toBe("Validate Testing Token");
    expect(output.subject_token_type).toBe("https://custom-issuer");
    expect(output.type).toBe("custom_authentication");
  });

  it("throws when profile.json is missing", async () => {
    mockExistsSync.mockReturnValue(false);
    await expect(
      handleTokenExchangeProfile(
        "/templates/Token Exchange > Testing",
        "/tenants/demo",
        fakePrompts()
      )
    ).rejects.toThrow(/No profile\.json found/);
  });

  it("throws when no actions directory exists", async () => {
    mockExistsSync.mockImplementation(
      (path) => typeof path === "string" && path.endsWith("profile.json")
    );
    await expect(
      handleTokenExchangeProfile(
        "/templates/Token Exchange > Testing",
        "/tenants/demo",
        fakePrompts()
      )
    ).rejects.toThrow(/No actions directory found/);
  });

  it("throws when no eligible actions are found", async () => {
    mockReadFileSync.mockImplementation((path) => {
      if (typeof path === "string" && path.endsWith("action.json")) {
        return JSON.stringify(postLoginAction);
      }
      return JSON.stringify(template);
    });
    await expect(
      handleTokenExchangeProfile(
        "/templates/Token Exchange > Testing",
        "/tenants/demo",
        fakePrompts()
      )
    ).rejects.toThrow(/No actions found supporting/);
  });

  it("throws when the output file already exists", async () => {
    mockExistsSync.mockImplementation((path) => {
      return (
        path === "/tenants/demo/token-exchange-profiles/Testing.json" ||
        (typeof path === "string" &&
          (path.endsWith("profile.json") || path.endsWith("actions")))
      );
    });
    await expect(
      handleTokenExchangeProfile(
        "/templates/Token Exchange > Testing",
        "/tenants/demo",
        fakePrompts()
      )
    ).rejects.toThrow(/File already exists/);
  });

  it("creates the token-exchange-profiles directory when it does not exist", async () => {
    await handleTokenExchangeProfile(
      "/templates/Token Exchange > Testing",
      "/tenants/demo",
      fakePrompts()
    );
    expect(mockMkdirSync).toHaveBeenCalledWith("/tenants/demo/token-exchange-profiles", {
      recursive: true,
    });
  });
});
