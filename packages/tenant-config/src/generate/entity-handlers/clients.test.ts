import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PromptSession } from "auth0-config-demo-modules/packages/core/src/index.js";
import { deriveClientName, handleClient } from "./clients.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockMkdirSync = vi.mocked(mkdirSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

function fakePrompts(): PromptSession {
  return {
    text: vi.fn().mockResolvedValue(""),
    confirm: vi.fn().mockResolvedValue(false),
  } as unknown as PromptSession;
}

const template = {
  app_type: "regular_web",
  client_metadata: {},
};

describe("deriveClientName", () => {
  it("returns the folder name after the type prefix", () => {
    const name = deriveClientName("/templates/Client > Web Application");
    expect(name).toBe("Web Application");
  });

  it("rejoins any additional ' > ' segments", () => {
    const name = deriveClientName("/templates/Client > Group > Nested Name");
    expect(name).toBe("Group > Nested Name");
  });
});

describe("handleClient", () => {
  beforeEach(() => {
    mockExistsSync.mockImplementation(
      (path) => typeof path === "string" && path.endsWith("client.json")
    );
    mockReadFileSync.mockReturnValue(JSON.stringify(template));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads client.json from the template directory", async () => {
    await handleClient(
      "/templates/Client > Web Application",
      "/tenants/demo",
      fakePrompts()
    );
    expect(mockReadFileSync).toHaveBeenCalledWith(
      "/templates/Client > Web Application/client.json",
      "utf-8"
    );
  });

  it("defaults the name to the template folder name when no input given", async () => {
    await handleClient(
      "/templates/Client > Web Application",
      "/tenants/demo",
      fakePrompts()
    );
    const [outputPath, contents] = mockWriteFileSync.mock.calls[0]!;
    expect(outputPath).toBe("/tenants/demo/clients/Web Application.json");
    expect(JSON.parse(contents as string).name).toBe("Web Application");
  });

  it("uses the provided name over the folder default", async () => {
    const prompts = fakePrompts();
    vi.mocked(prompts.text).mockResolvedValueOnce("My Custom App");
    await handleClient("/templates/Client > Web Application", "/tenants/demo", prompts);
    const [outputPath, contents] = mockWriteFileSync.mock.calls[0]!;
    expect(outputPath).toBe("/tenants/demo/clients/My Custom App.json");
    expect(JSON.parse(contents as string).name).toBe("My Custom App");
  });

  it("throws when client.json is missing", async () => {
    mockExistsSync.mockReturnValue(false);
    await expect(
      handleClient("/templates/Client > Web Application", "/tenants/demo", fakePrompts())
    ).rejects.toThrow(/No client\.json found/);
  });

  it("throws when the output file already exists", async () => {
    mockExistsSync.mockImplementation((path) => {
      return (
        path === "/templates/Client > Web Application/client.json" ||
        path === "/tenants/demo/clients/Web Application.json"
      );
    });
    await expect(
      handleClient("/templates/Client > Web Application", "/tenants/demo", fakePrompts())
    ).rejects.toThrow(/File already exists/);
  });

  it("creates the clients directory when it does not exist", async () => {
    await handleClient(
      "/templates/Client > Web Application",
      "/tenants/demo",
      fakePrompts()
    );
    expect(mockMkdirSync).toHaveBeenCalledWith("/tenants/demo/clients", {
      recursive: true,
    });
  });
});
