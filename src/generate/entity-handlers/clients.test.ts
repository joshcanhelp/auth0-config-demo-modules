import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { confirmPrompt } from "../../scripts/utils/selectPrompt.js";
import { textPrompt } from "../../scripts/utils/textPrompt.js";
import { deriveClientName, handleClient } from "./clients.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));
vi.mock("../../scripts/utils/selectPrompt.js", () => ({
  confirmPrompt: vi.fn(),
}));
vi.mock("../../scripts/utils/textPrompt.js", () => ({
  textPrompt: vi.fn(),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockMkdirSync = vi.mocked(mkdirSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockConfirmPrompt = vi.mocked(confirmPrompt);
const mockTextPrompt = vi.mocked(textPrompt);

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
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    mockExistsSync.mockImplementation(
      (path) => typeof path === "string" && path.endsWith("client.json")
    );
    mockReadFileSync.mockReturnValue(JSON.stringify(template));
    mockTextPrompt.mockResolvedValue("");
    mockConfirmPrompt.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads client.json from the template directory", async () => {
    await handleClient("/templates/Client > Web Application", "/tenants/demo");
    expect(mockReadFileSync).toHaveBeenCalledWith(
      "/templates/Client > Web Application/client.json",
      "utf-8"
    );
  });

  it("defaults the name to the template folder name when no input given", async () => {
    await handleClient("/templates/Client > Web Application", "/tenants/demo");
    const [outputPath, contents] = mockWriteFileSync.mock.calls[0]!;
    expect(outputPath).toBe("/tenants/demo/clients/Web Application.json");
    expect(JSON.parse(contents as string).name).toBe("Web Application");
  });

  it("uses the provided name over the folder default", async () => {
    mockTextPrompt.mockResolvedValueOnce("My Custom App");
    await handleClient("/templates/Client > Web Application", "/tenants/demo");
    const [outputPath, contents] = mockWriteFileSync.mock.calls[0]!;
    expect(outputPath).toBe("/tenants/demo/clients/My Custom App.json");
    expect(JSON.parse(contents as string).name).toBe("My Custom App");
  });

  it("exits with error when client.json is missing", async () => {
    mockExistsSync.mockReturnValue(false);
    await expect(
      handleClient("/templates/Client > Web Application", "/tenants/demo")
    ).rejects.toThrow("process.exit called");
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("exits with error when the output file already exists", async () => {
    mockExistsSync.mockImplementation((path) => {
      return path === "/tenants/demo/clients/Web Application.json";
    });
    await expect(
      handleClient("/templates/Client > Web Application", "/tenants/demo")
    ).rejects.toThrow("process.exit called");
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("creates the clients directory when it does not exist", async () => {
    await handleClient("/templates/Client > Web Application", "/tenants/demo");
    expect(mockMkdirSync).toHaveBeenCalledWith("/tenants/demo/clients", {
      recursive: true,
    });
  });
});
