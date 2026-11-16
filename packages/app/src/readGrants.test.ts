import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readGrants, getClientGrants, clientHasScope } from "./readGrants.js";

const testDir = "./test-tenant-readgrants";

beforeEach(() => mkdirSync(join(testDir, "grants"), { recursive: true }));
afterEach(() => rmSync(testDir, { recursive: true, force: true }));

const grant = {
  id: "cgr_123",
  client_id: "client_abc",
  audience: "https://example.auth0.com/api/v2/",
  scope: ["create:users", "read:users"],
};

describe("readGrants", () => {
  it("returns empty array when grants directory does not exist", () => {
    rmSync(join(testDir, "grants"), { recursive: true });
    expect(readGrants(testDir)).toEqual([]);
  });

  it("returns grants from JSON files", () => {
    writeFileSync(join(testDir, "grants", "grant.json"), JSON.stringify(grant));
    const grants = readGrants(testDir);
    expect(grants).toHaveLength(1);
    expect(grants[0].client_id).toBe("client_abc");
  });

  it("skips non-JSON files", () => {
    writeFileSync(join(testDir, "grants", "grant.json"), JSON.stringify(grant));
    writeFileSync(join(testDir, "grants", "notes.txt"), "ignore me");
    expect(readGrants(testDir)).toHaveLength(1);
  });
});

describe("getClientGrants", () => {
  it("returns grants matching the client id", () => {
    const other = { ...grant, client_id: "other_client" };
    expect(getClientGrants([grant, other], "client_abc")).toEqual([grant]);
  });

  it("returns empty array when no grants match", () => {
    expect(getClientGrants([grant], "unknown")).toEqual([]);
  });
});

describe("clientHasScope", () => {
  it("returns true when client has the scope", () => {
    expect(clientHasScope([grant], "client_abc", "create:users")).toBe(true);
  });

  it("returns false when client does not have the scope", () => {
    expect(clientHasScope([grant], "client_abc", "delete:users")).toBe(false);
  });

  it("returns false when client id does not match", () => {
    expect(clientHasScope([grant], "other_client", "create:users")).toBe(false);
  });
});
