import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readConnections, getClientConnections } from "./readConnections.js";

const testDir = "./test-tenant-readconnections";

const dbConn = {
  name: "Username-Password-Authentication",
  strategy: "auth0",
  enabled_clients: ["client-a"],
};
const socialConn = {
  name: "google-oauth2",
  strategy: "google-oauth2",
  enabled_clients: ["client-a", "client-b"],
};

beforeEach(() => {
  mkdirSync(join(testDir, "database-connections", "Username-Password-Authentication"), {
    recursive: true,
  });
  mkdirSync(join(testDir, "connections"), { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("readConnections", () => {
  it("reads database connections from database.json files", () => {
    writeFileSync(
      join(
        testDir,
        "database-connections",
        "Username-Password-Authentication",
        "database.json"
      ),
      JSON.stringify(dbConn)
    );

    const result = readConnections(testDir);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Username-Password-Authentication");
    expect(result[0].strategy).toBe("auth0");
  });

  it("reads social/enterprise connections from connections/*.json", () => {
    writeFileSync(
      join(testDir, "connections", "google-oauth2.json"),
      JSON.stringify(socialConn)
    );

    const result = readConnections(testDir);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("google-oauth2");
    expect(result[0].strategy).toBe("google-oauth2");
  });

  it("reads both connection types together", () => {
    writeFileSync(
      join(
        testDir,
        "database-connections",
        "Username-Password-Authentication",
        "database.json"
      ),
      JSON.stringify(dbConn)
    );
    writeFileSync(
      join(testDir, "connections", "google-oauth2.json"),
      JSON.stringify(socialConn)
    );

    expect(readConnections(testDir)).toHaveLength(2);
  });

  it("ignores non-JSON files in the connections directory", () => {
    writeFileSync(join(testDir, "connections", "template.html"), "<html>");
    expect(readConnections(testDir)).toHaveLength(0);
  });

  it("returns an empty array when neither directory exists", () => {
    expect(readConnections(testDir)).toHaveLength(0);
  });
});

describe("getClientConnections", () => {
  const connections = [dbConn, socialConn];

  it("returns only connections that include the client id", () => {
    const result = getClientConnections(connections, "client-a");
    expect(result).toHaveLength(2);
  });

  it("filters out connections not enabled for the client", () => {
    const result = getClientConnections(connections, "client-b");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("google-oauth2");
  });

  it("returns an empty array when no connections match", () => {
    expect(getClientConnections(connections, "client-c")).toHaveLength(0);
  });
});
