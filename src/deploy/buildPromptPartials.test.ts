import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildPromptPartials } from "./buildPromptPartials.js";

const testDir = "./test-tenant-buildpromptpartials";
const promptsDir = join(testDir, "prompts");
const partialsDir = join(promptsDir, "partials");

function makePartialFile(promptName: string, screenName: string, partialName: string) {
  mkdirSync(join(partialsDir, promptName, screenName), { recursive: true });
  writeFileSync(
    join(partialsDir, promptName, screenName, `${partialName}.liquid`),
    "<script></script>"
  );
}

function readPartialsJson() {
  return JSON.parse(readFileSync(join(promptsDir, "partials.json"), "utf-8"));
}

beforeEach(() => {
  mkdirSync(partialsDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("buildPromptPartials", () => {
  it("writes partials.json from scanned liquid files", () => {
    makePartialFile("login-id", "login-id", "form-footer-end");

    const changed = buildPromptPartials(testDir);

    expect(changed).toBe(true);
    const result = readPartialsJson();
    expect(result["login-id"]).toBeDefined();
    expect(result["login-id"][0]["login-id"][0]).toEqual({
      name: "form-footer-end",
      template: "partials/login-id/login-id/form-footer-end.liquid",
    });
  });

  it("includes all liquid files across prompts and screens", () => {
    makePartialFile("login-id", "login-id", "footer");
    makePartialFile("signup-id", "signup-id", "footer");

    buildPromptPartials(testDir);

    const result = readPartialsJson();
    expect(Object.keys(result)).toHaveLength(2);
    expect(result["login-id"][0]["login-id"][0].name).toBe("footer");
    expect(result["signup-id"][0]["signup-id"][0].name).toBe("footer");
  });

  it("returns false when content has not changed", () => {
    makePartialFile("login-id", "login-id", "footer");
    buildPromptPartials(testDir);

    const changed = buildPromptPartials(testDir);

    expect(changed).toBe(false);
  });

  it("returns true when a new file is added after the first build", () => {
    makePartialFile("login-id", "login-id", "footer");
    buildPromptPartials(testDir);
    makePartialFile("login-id", "login-id", "header");

    const changed = buildPromptPartials(testDir);

    expect(changed).toBe(true);
  });

  it("returns false when the partials directory does not exist", () => {
    rmSync(partialsDir, { recursive: true, force: true });

    expect(buildPromptPartials(testDir)).toBe(false);
  });

  it("writes an empty object when no liquid files are present", () => {
    buildPromptPartials(testDir);

    // partials dir exists but no files - no partials.json should be written
    // because existsSync returns true but files list is empty
    const result = readPartialsJson();
    expect(result).toEqual({});
  });
});
