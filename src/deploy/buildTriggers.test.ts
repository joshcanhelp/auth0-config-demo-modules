import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildTriggers } from "./buildTriggers.js";

const testDir = "./test-tenant-buildtriggers";
const actionsDir = join(testDir, "actions");
const triggersJsonPath = join(testDir, "triggers", "triggers.json");

function writeAction(name: string, triggerId: string, deployed: boolean = true): void {
  writeFileSync(
    join(actionsDir, `${name}.json`),
    JSON.stringify({
      name,
      deployed,
      supported_triggers: [{ id: triggerId, version: "v3" }],
    }) + "\n"
  );
}

function readTriggersJson(): Record<
  string,
  Array<{ action_name: string; display_name: string }>
> {
  return JSON.parse(readFileSync(triggersJsonPath, "utf-8"));
}

beforeEach(() => {
  mkdirSync(actionsDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("buildTriggers", () => {
  it("writes triggers.json from deployed actions", () => {
    writeAction("My Action", "post-login");

    const changed = buildTriggers(testDir);

    expect(changed).toBe(true);
    const result = readTriggersJson();
    expect(result["post-login"]).toEqual([
      { action_name: "My Action", display_name: "My Action" },
    ]);
  });

  it("excludes actions with deployed:false", () => {
    writeAction("Active Action", "post-login", true);
    writeAction("Inactive Action", "post-login", false);

    buildTriggers(testDir);

    const result = readTriggersJson();
    expect(result["post-login"]).toHaveLength(1);
    expect(result["post-login"][0].action_name).toBe("Active Action");
  });

  it("sorts actions alphabetically within each trigger", () => {
    writeAction("Zebra Action", "post-login");
    writeAction("Alpha Action", "post-login");
    writeAction("Middle Action", "post-login");

    buildTriggers(testDir);

    const names = readTriggersJson()["post-login"].map(
      (b: { action_name: string }) => b.action_name
    );
    expect(names).toEqual(["Alpha Action", "Middle Action", "Zebra Action"]);
  });

  it("groups actions by trigger ID", () => {
    writeAction("Login Action", "post-login");
    writeAction("Reg Action", "pre-user-registration");

    buildTriggers(testDir);

    const result = readTriggersJson();
    expect(result["post-login"]).toHaveLength(1);
    expect(result["pre-user-registration"]).toHaveLength(1);
  });

  it("returns false when content has not changed", () => {
    writeAction("My Action", "post-login");
    buildTriggers(testDir);

    const changed = buildTriggers(testDir);

    expect(changed).toBe(false);
  });

  it("returns true when an action is added after the first build", () => {
    writeAction("First Action", "post-login");
    buildTriggers(testDir);
    writeAction("Second Action", "post-login");

    const changed = buildTriggers(testDir);

    expect(changed).toBe(true);
  });

  it("creates the triggers directory if it does not exist", () => {
    writeAction("My Action", "post-login");

    buildTriggers(testDir);

    expect(() => readTriggersJson()).not.toThrow();
  });

  it("returns false when the actions directory does not exist", () => {
    rmSync(actionsDir, { recursive: true, force: true });

    expect(buildTriggers(testDir)).toBe(false);
  });

  it("writes an empty object when all actions are filtered out", () => {
    writeAction("Inactive", "post-login", false);

    buildTriggers(testDir);

    expect(readTriggersJson()).toEqual({});
  });
});
