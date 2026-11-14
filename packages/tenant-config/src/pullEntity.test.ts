import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Auth0ManagementApiClient, EntityDefinition } from "./entityRegistry.js";
import { pullEntity, pullSingleFile } from "./pullEntity.js";

const fakeClients: Record<string, unknown>[] = [
  { client_id: "abc123", name: "My App" },
  { client_id: "def456", name: "Other App" },
];

const fakeEntity: EntityDefinition = {
  name: "clients",
  list: async () => fakeClients,
  get: async (_api, id) => fakeClients.find((c) => c.client_id === id)!,
  create: async (_api, body) => body,
  update: async (_api, _id, body) => body,
  identifierField: "client_id",
  fileName: (record) => String(record.name),
};

const fakeApi = {} as Auth0ManagementApiClient;

describe("pullEntity", () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes one file per record, named after the entity's fileName", async () => {
    dir = await mkdtemp(join(tmpdir(), "pull-test-"));

    const paths = await pullEntity(fakeApi, dir, fakeEntity);

    expect(paths.sort()).toEqual(
      [join(dir, "clients", "My App.json"), join(dir, "clients", "Other App.json")].sort()
    );
    const written = JSON.parse(
      await readFile(join(dir, "clients", "My App.json"), "utf-8")
    );
    expect(written).toEqual({ client_id: "abc123", name: "My App" });
  });
});

describe("pullSingleFile", () => {
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("re-fetches the record identified by the existing file's identifierField", async () => {
    dir = await mkdtemp(join(tmpdir(), "pull-test-"));
    await mkdir(join(dir, "clients"), { recursive: true });
    await writeFile(
      join(dir, "clients", "My App.json"),
      JSON.stringify({ client_id: "abc123", name: "My App", stale: true })
    );

    const filePath = await pullSingleFile(fakeApi, dir, fakeEntity, "My App");

    expect(filePath).toBe(join(dir, "clients", "My App.json"));
    const written = JSON.parse(await readFile(filePath, "utf-8"));
    expect(written).toEqual({ client_id: "abc123", name: "My App" });
  });

  it("writes to the record's current name if it changed since the last pull", async () => {
    dir = await mkdtemp(join(tmpdir(), "pull-test-"));
    await mkdir(join(dir, "clients"), { recursive: true });
    await writeFile(
      join(dir, "clients", "Old Name.json"),
      JSON.stringify({ client_id: "abc123", name: "Old Name" })
    );

    const filePath = await pullSingleFile(fakeApi, dir, fakeEntity, "Old Name");

    expect(filePath).toBe(join(dir, "clients", "My App.json"));
  });

  it("throws when the existing file has no value for identifierField", async () => {
    dir = await mkdtemp(join(tmpdir(), "pull-test-"));
    await mkdir(join(dir, "clients"), { recursive: true });
    await writeFile(
      join(dir, "clients", "My App.json"),
      JSON.stringify({ name: "My App" })
    );

    await expect(pullSingleFile(fakeApi, dir, fakeEntity, "My App")).rejects.toThrow(
      /missing "client_id"/
    );
  });
});
