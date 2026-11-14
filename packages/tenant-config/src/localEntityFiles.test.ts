import { afterEach, describe, expect, it, vi } from "vitest";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PromptSession } from "auth0-config-demo-modules/packages/core/src/index.js";
import type { EntityDefinition } from "./entityRegistry.js";
import {
  confirmAndRemoveMissingRecord,
  localEntityNames,
  localFileNames,
  readEntityRecord,
  writeEntityRecord,
} from "./localEntityFiles.js";

function fakePrompts(confirmed: boolean): PromptSession {
  return { confirm: vi.fn().mockResolvedValue(confirmed) } as unknown as PromptSession;
}

const fakeEntity: EntityDefinition = {
  name: "clients",
  list: async () => [],
  get: async () => ({}),
  create: async () => ({}),
  update: async () => ({}),
  identifierField: "client_id",
  fileName: (record) => String(record.name),
};

describe("writeEntityRecord", () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes a record to <tenantDir>/<entity>/<fileName>.json, keys alphabetized", async () => {
    dir = await mkdtemp(join(tmpdir(), "local-files-test-"));

    const filePath = await writeEntityRecord(dir, fakeEntity, {
      client_id: "abc123",
      name: "My App",
    });

    expect(filePath).toBe(join(dir, "clients", "My App.json"));
    expect(await readFile(filePath, "utf-8")).toBe(
      JSON.stringify({ client_id: "abc123", name: "My App" }, null, 2) + "\n"
    );
  });

  it("removes the old file when a record's name - and so its filename - has changed (no previousBaseFileName given, falls back to scanning)", async () => {
    dir = await mkdtemp(join(tmpdir(), "local-files-test-"));
    await mkdir(join(dir, "clients"), { recursive: true });
    await writeFile(
      join(dir, "clients", "Old Name.json"),
      JSON.stringify({ client_id: "abc123", name: "Old Name" })
    );

    const filePath = await writeEntityRecord(dir, fakeEntity, {
      client_id: "abc123",
      name: "New Name",
    });

    expect(filePath).toBe(join(dir, "clients", "New Name.json"));
    await expect(access(join(dir, "clients", "Old Name.json"))).rejects.toThrow();
  });

  it("removes the exact previousBaseFileName given, even if a stale file under the new name already exists", async () => {
    // Reproduces a real bug: a prior run (before this fix) left both the old and new file
    // sitting side by side - the scan-based fallback alone would never clean this up, since it
    // short-circuits the moment it sees the target file already holds this record.
    dir = await mkdtemp(join(tmpdir(), "local-files-test-"));
    await mkdir(join(dir, "clients"), { recursive: true });
    await writeFile(
      join(dir, "clients", "Old Name.json"),
      JSON.stringify({ client_id: "abc123", name: "New Name" })
    );
    await writeFile(
      join(dir, "clients", "New Name.json"),
      JSON.stringify({ client_id: "abc123", name: "New Name" })
    );

    const filePath = await writeEntityRecord(
      dir,
      fakeEntity,
      { client_id: "abc123", name: "New Name" },
      "Old Name"
    );

    expect(filePath).toBe(join(dir, "clients", "New Name.json"));
    await expect(access(join(dir, "clients", "Old Name.json"))).rejects.toThrow();
  });

  it("does nothing when previousBaseFileName already matches the target (no rename)", async () => {
    dir = await mkdtemp(join(tmpdir(), "local-files-test-"));

    const filePath = await writeEntityRecord(
      dir,
      fakeEntity,
      { client_id: "abc123", name: "My App" },
      "My App"
    );

    expect(filePath).toBe(join(dir, "clients", "My App.json"));
  });

  it("leaves other records' files alone", async () => {
    dir = await mkdtemp(join(tmpdir(), "local-files-test-"));
    await mkdir(join(dir, "clients"), { recursive: true });
    await writeFile(
      join(dir, "clients", "Other App.json"),
      JSON.stringify({ client_id: "def456", name: "Other App" })
    );

    await writeEntityRecord(dir, fakeEntity, { client_id: "abc123", name: "My App" });

    await expect(access(join(dir, "clients", "Other App.json"))).resolves.toBeUndefined();
  });
});

describe("readEntityRecord", () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("reads and parses an existing local file", async () => {
    dir = await mkdtemp(join(tmpdir(), "local-files-test-"));
    await mkdir(join(dir, "clients"), { recursive: true });
    await writeFile(
      join(dir, "clients", "My App.json"),
      JSON.stringify({ client_id: "abc123", name: "My App" })
    );

    expect(await readEntityRecord(dir, fakeEntity, "My App")).toEqual({
      client_id: "abc123",
      name: "My App",
    });
  });
});

describe("confirmAndRemoveMissingRecord", () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("deletes the file and returns true when confirmed", async () => {
    dir = await mkdtemp(join(tmpdir(), "local-files-test-"));
    await mkdir(join(dir, "clients"), { recursive: true });
    await writeFile(join(dir, "clients", "Gone App.json"), "{}");

    const result = await confirmAndRemoveMissingRecord(
      fakePrompts(true),
      dir,
      fakeEntity,
      "Gone App"
    );

    expect(result).toBe(true);
    await expect(access(join(dir, "clients", "Gone App.json"))).rejects.toThrow();
  });

  it("leaves the file in place and returns false when declined", async () => {
    dir = await mkdtemp(join(tmpdir(), "local-files-test-"));
    await mkdir(join(dir, "clients"), { recursive: true });
    await writeFile(join(dir, "clients", "Gone App.json"), "{}");

    const result = await confirmAndRemoveMissingRecord(
      fakePrompts(false),
      dir,
      fakeEntity,
      "Gone App"
    );

    expect(result).toBe(false);
    await expect(access(join(dir, "clients", "Gone App.json"))).resolves.toBeUndefined();
  });
});

describe("localEntityNames", () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("lists only registered entity directories that exist locally", async () => {
    dir = await mkdtemp(join(tmpdir(), "local-files-test-"));
    await mkdir(join(dir, "clients"), { recursive: true });
    await mkdir(join(dir, "not-a-registered-entity"), { recursive: true });

    expect(await localEntityNames(dir)).toEqual(["clients"]);
  });

  it("returns an empty list when the tenant directory doesn't exist", async () => {
    dir = await mkdtemp(join(tmpdir(), "local-files-test-"));
    expect(await localEntityNames(join(dir, "missing"))).toEqual([]);
  });
});

describe("localFileNames", () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("lists local file names without their .json extension", async () => {
    dir = await mkdtemp(join(tmpdir(), "local-files-test-"));
    await mkdir(join(dir, "clients"), { recursive: true });
    await writeFile(join(dir, "clients", "My App.json"), "{}");
    await writeFile(join(dir, "clients", "notes.txt"), "ignore me");

    expect(await localFileNames(dir, fakeEntity)).toEqual(["My App"]);
  });

  it("returns an empty list when the entity directory doesn't exist locally", async () => {
    dir = await mkdtemp(join(tmpdir(), "local-files-test-"));
    expect(await localFileNames(dir, fakeEntity)).toEqual([]);
  });
});
