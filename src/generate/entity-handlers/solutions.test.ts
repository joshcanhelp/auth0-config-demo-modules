import { existsSync, readFileSync, readdirSync } from "node:fs";
import process from "node:process";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { confirmPrompt } from "../../scripts/utils/selectPrompt.js";
import { deriveActionName, writeAction } from "./actions.js";
import { deriveFlowName, writeFlow } from "./flows.js";
import { deriveFormName, writeForm } from "./forms.js";
import { handleSolution } from "./solutions.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
}));
vi.mock("../../scripts/utils/selectPrompt.js", () => ({
  confirmPrompt: vi.fn(),
}));
vi.mock("./actions.js", () => ({
  deriveActionName: vi.fn(),
  writeAction: vi.fn(),
}));
vi.mock("./flows.js", () => ({
  deriveFlowName: vi.fn(),
  writeFlow: vi.fn(),
}));
vi.mock("./forms.js", () => ({
  deriveFormName: vi.fn(),
  writeForm: vi.fn(),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockReaddirSync = vi.mocked(readdirSync);
const mockConfirmPrompt = vi.mocked(confirmPrompt);
const mockDeriveActionName = vi.mocked(deriveActionName);
const mockWriteAction = vi.mocked(writeAction);
const mockDeriveFlowName = vi.mocked(deriveFlowName);
const mockWriteFlow = vi.mocked(writeFlow);
const mockDeriveFormName = vi.mocked(deriveFormName);
const mockWriteForm = vi.mocked(writeForm);

const templateDir = "/templates/Solution > Onboarding";
const templatesDir = "/templates";
const tenantDir = "/tenants/demo";

describe("handleSolution", () => {
  beforeEach(() => {
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    mockDeriveActionName.mockReturnValue("derived-action-name");
    mockDeriveFlowName.mockReturnValue("derived-flow-name");
    mockDeriveFormName.mockReturnValue("derived-form-name");
    mockConfirmPrompt.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("without solution.json", () => {
    it("falls back to scanning subdirectories and dispatches by type prefix", async () => {
      mockExistsSync.mockReturnValue(false);
      mockReaddirSync.mockReturnValue([
        { name: "Action > Post-Login > Add Claims", isDirectory: () => true },
        { name: "Flow > Send Email", isDirectory: () => true },
        { name: "Something > Unknown", isDirectory: () => true },
        { name: ".hidden", isDirectory: () => true },
        { name: "not-a-dir", isDirectory: () => false },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);

      await handleSolution(templateDir, tenantDir, templatesDir);

      expect(mockWriteAction).toHaveBeenCalledWith(
        `${templateDir}/Action > Post-Login > Add Claims`,
        tenantDir,
        "derived-action-name"
      );
      expect(mockWriteFlow).toHaveBeenCalledWith(
        `${templateDir}/Flow > Send Email`,
        tenantDir,
        "derived-flow-name"
      );
      expect(mockWriteForm).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        'Skipping unknown entity type: "Something > Unknown"'
      );
    });
  });

  describe("with solution.json as an array", () => {
    it("verifies every referenced template exists before writing any of them", async () => {
      mockExistsSync.mockImplementation((path) => {
        if (path === `${templateDir}/solution.json`) return true;
        return path === `${templatesDir}/Action > Post-Login > Add Claims`;
      });
      mockReadFileSync.mockReturnValue(
        JSON.stringify(["Action > Post-Login > Add Claims", "Flow > Missing Flow"])
      );

      await expect(handleSolution(templateDir, tenantDir, templatesDir)).rejects.toThrow(
        "process.exit called"
      );

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Flow > Missing Flow")
      );
      expect(mockWriteAction).not.toHaveBeenCalled();
      expect(mockWriteFlow).not.toHaveBeenCalled();
    });

    it("writes each referenced template using its derived name once all exist", async () => {
      mockExistsSync.mockImplementation((path) => {
        if (path === `${templateDir}/solution.json`) return true;
        return (
          path === `${templatesDir}/Action > Post-Login > Add Claims` ||
          path === `${templatesDir}/Flow > Send Email`
        );
      });
      mockReadFileSync.mockReturnValue(
        JSON.stringify(["Action > Post-Login > Add Claims", "Flow > Send Email"])
      );

      await handleSolution(templateDir, tenantDir, templatesDir);

      expect(mockWriteAction).toHaveBeenCalledWith(
        `${templatesDir}/Action > Post-Login > Add Claims`,
        tenantDir,
        "derived-action-name"
      );
      expect(mockWriteFlow).toHaveBeenCalledWith(
        `${templatesDir}/Flow > Send Email`,
        tenantDir,
        "derived-flow-name"
      );
    });
  });

  describe("with solution.json as an object", () => {
    it("overrides the derived name with the customization value when provided", async () => {
      mockExistsSync.mockImplementation((path) => {
        if (path === `${templateDir}/solution.json`) return true;
        return path === `${templatesDir}/Action > Post-Login > Add Claims`;
      });
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          "Action > Post-Login > Add Claims": { name: "Custom Action Name" },
        })
      );

      await handleSolution(templateDir, tenantDir, templatesDir);

      expect(mockWriteAction).toHaveBeenCalledWith(
        `${templatesDir}/Action > Post-Login > Add Claims`,
        tenantDir,
        "Custom Action Name"
      );
    });

    it("falls back to the derived name when no customization is given for an entry", async () => {
      mockExistsSync.mockImplementation((path) => {
        if (path === `${templateDir}/solution.json`) return true;
        return path === `${templatesDir}/Action > Post-Login > Add Claims`;
      });
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ "Action > Post-Login > Add Claims": null })
      );

      await handleSolution(templateDir, tenantDir, templatesDir);

      expect(mockWriteAction).toHaveBeenCalledWith(
        `${templatesDir}/Action > Post-Login > Add Claims`,
        tenantDir,
        "derived-action-name"
      );
    });
  });

  describe("with an optional entry", () => {
    it("writes the entity when the developer confirms", async () => {
      mockExistsSync.mockImplementation((path) => {
        if (path === `${templateDir}/solution.json`) return true;
        return path === `${templatesDir}/Action > Post-Login > Add Claims`;
      });
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          "Action > Post-Login > Add Claims": { optional: true },
        })
      );
      mockConfirmPrompt.mockResolvedValue(true);

      await handleSolution(templateDir, tenantDir, templatesDir);

      expect(mockConfirmPrompt).toHaveBeenCalledWith('Create "derived-action-name"?');
      expect(mockWriteAction).toHaveBeenCalledWith(
        `${templatesDir}/Action > Post-Login > Add Claims`,
        tenantDir,
        "derived-action-name"
      );
    });

    it("skips writing the entity when the developer declines", async () => {
      mockExistsSync.mockImplementation((path) => {
        if (path === `${templateDir}/solution.json`) return true;
        return path === `${templatesDir}/Action > Post-Login > Add Claims`;
      });
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          "Action > Post-Login > Add Claims": { optional: true },
        })
      );
      mockConfirmPrompt.mockResolvedValue(false);

      await handleSolution(templateDir, tenantDir, templatesDir);

      expect(mockWriteAction).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Skipping: "derived-action-name"');
    });

    it("does not prompt for entries without the optional flag", async () => {
      mockExistsSync.mockImplementation((path) => {
        if (path === `${templateDir}/solution.json`) return true;
        return path === `${templatesDir}/Action > Post-Login > Add Claims`;
      });
      mockReadFileSync.mockReturnValue(
        JSON.stringify(["Action > Post-Login > Add Claims"])
      );

      await handleSolution(templateDir, tenantDir, templatesDir);

      expect(mockConfirmPrompt).not.toHaveBeenCalled();
      expect(mockWriteAction).toHaveBeenCalled();
    });

    it("uses the overridden name in the confirmation prompt", async () => {
      mockExistsSync.mockImplementation((path) => {
        if (path === `${templateDir}/solution.json`) return true;
        return path === `${templatesDir}/Action > Post-Login > Add Claims`;
      });
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          "Action > Post-Login > Add Claims": {
            name: "Custom Action Name",
            optional: true,
          },
        })
      );

      await handleSolution(templateDir, tenantDir, templatesDir);

      expect(mockConfirmPrompt).toHaveBeenCalledWith('Create "Custom Action Name"?');
    });
  });
});
